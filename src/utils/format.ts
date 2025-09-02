const pad2 = (n: number) => String(n).padStart(2, '0');

export function fmtDate(value?: string | Date) {
  if (!value) return '-';
  const raw = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return `${pad2(d)}.${pad2(m)}.${y}`;
  }

  const d = new Date(raw.replace(' ', 'T')); 
  if (isNaN(d.getTime())) return raw;

  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtDateOnly(value?: string | Date) {
  if (!value) return '-';
  const d = new Date(String(value).replace(' ', 'T'));
  if (isNaN(d.getTime())) {
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : String(value);
  }
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}
