    export const API_BASE =
    (import.meta as any)?.env?.VITE_API_BASE ||
    (window as any).API_BASE ||
    'http://192.168.42.172:4018/api/';

    const KEYS = { ACCESS: 'jwt_access', REFRESH: 'jwt_refresh', LAST_LOGIN: 'last_login_username' };

    function getAccess() { return localStorage.getItem(KEYS.ACCESS) || ''; }
    function getRefresh() { return localStorage.getItem(KEYS.REFRESH) || ''; }
    function setTokens(tokens: { access: string; refresh?: string }) {
    if (tokens.access) localStorage.setItem(KEYS.ACCESS, tokens.access);
    if (tokens.refresh) localStorage.setItem(KEYS.REFRESH, tokens.refresh);
    }
    function clearTokens() { localStorage.removeItem(KEYS.ACCESS); localStorage.removeItem(KEYS.REFRESH); }

    async function errorFrom(resp: Response) {
    let payload: any = {};
    try { payload = await resp.json(); } catch {}
    const msg = payload?.detail || payload?.error || resp.statusText || `HTTP ${resp.status}`;
    const err = new Error(msg) as any; err.status = resp.status; err.payload = payload; return err;
    }

    const isForm = (b: any) => typeof FormData !== 'undefined' && b instanceof FormData;

    let refreshingPromise: Promise<boolean> | null = null;

    async function rawFetch(url: string, options: RequestInit = {}, { retry = true } = {}) {
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !isForm(options.body)) headers.set('Content-Type', 'application/json');

    const a = getAccess();
    if (a) headers.set('Authorization', `Bearer ${a}`);

    const resp = await fetch(url, { ...options, headers });

    if (resp.status === 401 && retry && getRefresh()) {
        const ok = await auth.refresh();
        if (ok) return rawFetch(url, options, { retry: false });
        clearTokens();
    }
    return resp;
    }

    function toQuery(params: Record<string, any> = {}) {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        sp.append(k, String(v));
    });
    const qs = sp.toString(); return qs ? `?${qs}` : '';
    }

    const AUTH_BASE = `${API_BASE}/auth`;

    export const auth = {
    async login(username: string, password: string) {
        const resp = await fetch(`${AUTH_BASE}/token/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        });
        if (!resp.ok) throw await errorFrom(resp);
        const data = await resp.json();
        setTokens({ access: data.access, refresh: data.refresh });
        localStorage.setItem(KEYS.LAST_LOGIN, username);
        return data;
    },

    async refresh() {
        if (refreshingPromise) return refreshingPromise;
        const r = getRefresh(); if (!r) return false;

        refreshingPromise = (async () => {
        try {
            const resp = await fetch(`${AUTH_BASE}/token/refresh/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: r }),
            });
            if (!resp.ok) { refreshingPromise = null; return false; }
            const data = await resp.json();
            setTokens({ access: data.access, refresh: data.refresh ?? r });
            refreshingPromise = null; return true;
        } catch { refreshingPromise = null; return false; }
        })();

        return refreshingPromise;
    },

async me() {
  const resp = await rawFetch(`${AUTH_BASE}/me/`);
  if (resp.status === 404) {
    const username = localStorage.getItem(KEYS.LAST_LOGIN) || 'user';
    return { id: 0, username, role: 'operator', position: 'operator', name: username, initials: username[0]?.toUpperCase() || 'U' };
  }
  if (!resp.ok) throw await errorFrom(resp);

  const data: any = await resp.json();

  const role =
    data.role ||
    data.position ||
    data.role_name ||
    data.role_display ||
    (Array.isArray(data.groups) && data.groups[0]?.name) ||
    (data.is_superuser ? 'administrator' : data.is_staff ? 'staff' : 'operator');

  // ВАЖНО: собираем “First name Last name”
  const name =
    (data.display && String(data.display).trim()) ||
    [data.first_name, data.last_name].filter(Boolean).join(' ').trim() ||
    (data.fio && String(data.fio).trim()) ||
    data.username;

  // Инициалы для аватара
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join('')
    .toUpperCase();

  return { ...data, role, name, initials };
},


    logout() { clearTokens(); },
    };

    function resource(path: string) {
    const base = `${API_BASE}/${path}`;
    return {
        async list(params?: any) { const r = await rawFetch(`${base}/${toQuery(params)}`); if (!r.ok) throw await errorFrom(r); return r.json(); },
        async retrieve(id: number | string) { const r = await rawFetch(`${base}/${id}/`); if (!r.ok) throw await errorFrom(r); return r.json(); },
        async create(data: any) { const r = await rawFetch(`${base}/`, { method:'POST', body: isForm(data)?data:JSON.stringify(data) }); if (!r.ok) throw await errorFrom(r); return r.json(); },
        async update(id: number | string, data: any, partial = true) { const m = partial?'PATCH':'PUT'; const r = await rawFetch(`${base}/${id}/`, { method:m, body:isForm(data)?data:JSON.stringify(data) }); if (!r.ok) throw await errorFrom(r); return r.json(); },
        async remove(id: number | string) { const r = await rawFetch(`${base}/${id}/`, { method:'DELETE' }); if (!r.ok) throw await errorFrom(r); return true; },
    };
    }

    export const actives = {
    ...resource('actives'),
    async patchFixation(id: number | string, payload: any) {
        const resp = await rawFetch(`${API_BASE}/actives/${id}/fixation/`, { method:'PATCH', body: JSON.stringify(payload) });
        if (!resp.ok) throw await errorFrom(resp);
        return resp.json();
    },
    };

    export const suspends = {
    ...resource('suspends'),
    async patchFixation(id: number | string, payload: any) {
        const resp = await rawFetch(`${API_BASE}/suspends/${id}/fixation/`, { method:'PATCH', body: JSON.stringify(payload) });
        if (!resp.ok) throw await errorFrom(resp);
        return resp.json();
    },
    };

    export const fixeds = {
    ...resource('fixeds'),
    };

    export const excelUploads = {
    async upload(file: File, extras?: { original_name?: string; batch_tag?: string }) {
        const form = new FormData();
        form.append('file', file);
        if (extras?.original_name) form.append('original_name', extras.original_name);
        if (extras?.batch_tag) form.append('batch_tag', extras.batch_tag);
        const resp = await rawFetch(`${API_BASE}/excel-uploads/`, { method: 'POST', body: form });
        if (!resp.ok) throw await errorFrom(resp);
        return resp.json();
    },
    };

    export const searchAll = {
    async list(params?: any) {
        const r = await rawFetch(`${API_BASE}/search-all/${toQuery(params)}`);
        if (!r.ok) throw await errorFrom(r);
        return r.json();
    },
    };
