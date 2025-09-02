// src/components/workspace/ServicedTable.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Checkbox, Dropdown, Input, Pagination, Space, Table, Divider } from 'antd';
import { FilterOutlined, SearchOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fixeds } from '../../store/api';            // CHANGED: fixeds вместо fixations
import { useAuthStore } from '../../store/authStore';
import { fmtDate } from '../../utils/format';

const ACTION_BTN_BASE: React.CSSProperties = {
  height: 36,
  lineHeight: '36px',
  padding: '0 16px',
  borderRadius: 18,
  fontWeight: 600,
  fontSize: 14,
  minWidth: 100,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ACTION_COLORS = {
  chooseBg: '#1677ff',
  chooseText: '#ffffff',
  editBorder: '#fa8c16',
  editText: '#d46b08',
};

const ALL_SEARCH_FIELDS = ['client', 'account', 'msisdn', 'phone'] as const;
type SearchField = typeof ALL_SEARCH_FIELDS[number];

const DEFAULT_COLUMNS = [
  'branches',
  'rate_plan',
  'client',
  'subscription_fee',
  'msisdn',
  'phone',
  'status_call',
  'call_result',
  'abonent_answer',
  'note',
  'called_by',
  'called_at',
];

const columnTitles: Record<string, string> = {
  id:'ID', msisdn:'MSISDN', departments:'Отделы', status_from:'Статус от', client:'Клиент',
  rate_plan:'Тариф', balance:'Баланс', subscription_fee:'Абонентская плата', account:'Лицевой счёт',
  branches:'Филиалы', status:'Статус', phone:'Номер абонента',
  status_call:'Статус звонка', call_result:'Результат обзвона', abonent_answer:'Ответ абонента',
  note:'Примечание', tech:'Технология', created_at:'Дата создания', updated_at:'Дата обновления',
  called_by:'Кто обслужил', called_by_id:'ID оператора',
  called_at:"Дата обзвона", days_in_status:"Дней в статусе", write_offs_date:"Дата списания",moved_at:"Дата переноса", fixed_by: 'ID оператора',
  fixed_by_label: 'Кто обслужил',
  fixed_at: 'Дата фиксации',
};

export default function ServicedTable() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuthStore();

  const LS_PREFIX = `cccrm_${user?.username || 'user'}_serviced_`;
  const STORAGE_COLS = `${LS_PREFIX}columns_v1`;
  const STORAGE_LAST = `${LS_PREFIX}last_v1`;

  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchColumns, setSearchColumns] = useState<SearchField[]>([...ALL_SEARCH_FIELDS]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // сортировка для fixeds: логично по времени фиксации (если поле есть), иначе created_at
  const [ordering] = useState<string>('-fixed_at');   // CHANGED: по умолчанию fixed_at

  const colsInitRef = useRef(false);
  useEffect(() => {
    if (colsInitRef.current) return;
    colsInitRef.current = true;

    let saved: string[] | null = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_COLS) || '[]'); } catch { saved = null; }
    const initial = Array.isArray(saved) && saved.length ? saved : DEFAULT_COLUMNS;
    setVisibleColumns(initial);
    localStorage.setItem(STORAGE_COLS, JSON.stringify(initial));
  }, [STORAGE_COLS]);

  useEffect(() => {
    localStorage.setItem(STORAGE_COLS, JSON.stringify(visibleColumns));
  }, [visibleColumns, STORAGE_COLS]);

  const searchInitRef = useRef(false);
  useEffect(() => {
    if (searchInitRef.current) return;
    searchInitRef.current = true;

    const q = params.get('q') || '';
    const p = Number(params.get('page') || 1);
    const ps = Number(params.get('ps') || 50);
    const by = params.get('by');

    if (by) {
      const parsed = by.split(',').map(s => s.trim()).filter((s): s is SearchField => (ALL_SEARCH_FIELDS as readonly string[]).includes(s));
      if (parsed.length) setSearchColumns(parsed);
    }
    setSearchInput(q);
    setSearch(q);
    setPage(isNaN(p) ? 1 : p);
    setPageSize(isNaN(ps) ? 50 : ps);

    if (!q && !params.get('page')) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_LAST) || 'null');
        if (saved) {
          setSearchInput(saved.q || '');
          setSearch(saved.q || '');
          setPage(Number(saved.page) || 1);
          setPageSize(Number(saved.ps) || 50);
          if (Array.isArray(saved.by) && saved.by.length) {
            const parsed = saved.by.filter((s: string) => (ALL_SEARCH_FIELDS as readonly string[]).includes(s));
            if (parsed.length) setSearchColumns(parsed as SearchField[]);
          }
        }
      } catch {}
    }
  }, [STORAGE_LAST, params]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (search.trim()) next.set('q', search.trim());
    if (searchColumns.length) next.set('by', searchColumns.join(','));
    next.set('page', String(page));
    next.set('ps', String(pageSize));
    next.set('ord', ordering);
    setParams(next, { replace: true });

    localStorage.setItem(STORAGE_LAST, JSON.stringify({
      q: search.trim(), page, ps: pageSize, ord: ordering, by: searchColumns,
    }));
  }, [search, page, pageSize, ordering, searchColumns, setParams, STORAGE_LAST]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const payload: any = { page, page_size: pageSize, ordering };
        const q = search.trim();
        if (q) {
          payload.q = q;
          if (searchColumns.length) payload.fields = searchColumns.join(',');
        }
        const resp = await fixeds.list(payload);     // CHANGED: fixeds.list
        const results = (resp as any)?.results ?? resp ?? [];
        const count = (resp as any)?.count ?? (Array.isArray(results) ? results.length : 0);
        setData(results);
        setTotal(count);
      } finally {
        setLoading(false);
      }
    })();
  }, [search, page, pageSize, ordering, searchColumns]);

  const DATE_FIELDS = new Set([
    'status_from', 'write_offs_date', 'fixed_at', 'called_at',
    'created_at', 'updated_at'
  ]);

  const allColumns = useMemo(() => (data[0] ? Object.keys(data[0]) : []), [data]);

  useEffect(() => {
    if (!allColumns.length || !visibleColumns.length) return;
    const intersect = visibleColumns.filter(c => allColumns.includes(c));
    if (intersect.length !== visibleColumns.length || intersect.some((c, i) => c !== visibleColumns[i])) {
      setVisibleColumns(intersect);
      localStorage.setItem(STORAGE_COLS, JSON.stringify(intersect));
    }
  }, [allColumns, visibleColumns, STORAGE_COLS]);

  const chosenCount = useMemo(
    () => (allColumns.length ? visibleColumns.filter(c => allColumns.includes(c)).length : visibleColumns.length),
    [visibleColumns, allColumns]
  );

  const columns = useMemo(() => {
    const core = visibleColumns
      .filter(col => !allColumns.length || allColumns.includes(col))
      .map(col => ({
        title: columnTitles[col] || col,
        dataIndex: col,
        key: col,
        ellipsis: true,
        sorter: (a: any, b: any) => (a[col] || '').toString().localeCompare((b[col] || '').toString()),
        render: DATE_FIELDS.has(col) ? (v: any) => fmtDate(v) : undefined,
      }));

    const actions = {
      title: 'Действия',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button
          size="middle"
          type="default"
          style={{
            ...ACTION_BTN_BASE,
            background: '#fff',
            borderColor: ACTION_COLORS.editBorder,
            color: ACTION_COLORS.editText,
            borderWidth: 2,
          }}
          onClick={() => navigate(`/workspace/client/${record.id}?src=fixeds`)}
        >
          Открыть
        </Button>
      ),
    };

    return [...core, actions];
  }, [visibleColumns, allColumns, navigate]);

  const setDefaultCols = React.useCallback(() => {
    setVisibleColumns(DEFAULT_COLUMNS);
    localStorage.setItem(STORAGE_COLS, JSON.stringify(DEFAULT_COLUMNS));
  }, [STORAGE_COLS]);

  const setAllCols = React.useCallback(() => {
    const next = allColumns.length ? [...allColumns] : DEFAULT_COLUMNS;
    setVisibleColumns(next);
    localStorage.setItem(STORAGE_COLS, JSON.stringify(next));
  }, [STORAGE_COLS, allColumns]);

  const clearAllCols = React.useCallback(() => {
    setVisibleColumns([]);
    localStorage.setItem(STORAGE_COLS, JSON.stringify([]));
  }, [STORAGE_COLS]);

  const columnsMenu = (
    <Dropdown
      overlay={
        <div style={{ padding: 16, minWidth: 280, background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Настройка колонок</div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" type="primary" onClick={setDefaultCols}>По умолчанию</Button>
            <Button size="small" onClick={setAllCols}>Все</Button>
            <Button size="small" onClick={clearAllCols}>Сбросить</Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4 }}>
            <Checkbox.Group
              value={visibleColumns}
              onChange={(vals) => { setVisibleColumns(vals as string[]); localStorage.setItem(STORAGE_COLS, JSON.stringify(vals)); }}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {(allColumns.length ? allColumns : DEFAULT_COLUMNS).map(col => (
                  <Checkbox key={col} value={col} style={{ fontSize: 13, padding: '4px 0', width: '100%', margin: 0 }}>
                    <span style={{ color: '#595959' }}>{columnTitles[col] || col}</span>
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'center' }}>Выбрано: {chosenCount}</div>
        </div>
      }
      trigger={['click']}
      placement="bottomLeft"
    >
      <Button icon={<SettingOutlined />}>Колонки — {chosenCount}</Button>
    </Dropdown>
  );

  const searchMenu = (
    <Dropdown
      overlay={
        <div style={{ padding: 16, minWidth: 250, background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Поиск по столбцам</div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" type="primary" onClick={() => setSearchColumns([...ALL_SEARCH_FIELDS])}>Все</Button>
            <Button size="small" onClick={() => setSearchColumns([])}>Сбросить</Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <Checkbox.Group value={searchColumns} onChange={(vals) => setSearchColumns(vals as SearchField[])} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {ALL_SEARCH_FIELDS.map(col => (
                <Checkbox key={col} value={col} style={{ fontSize: 13, padding: '4px 0', width: '100%', margin: 0 }}>
                  <span style={{ color: '#595959' }}>{col}</span>
                </Checkbox>
              ))}
            </Space>
          </Checkbox.Group>
        </div>
      }
      trigger={['click']}
      placement="bottomLeft"
    >
      <Button icon={<FilterOutlined />}>Поиск по ({searchColumns.length}/{ALL_SEARCH_FIELDS.length})</Button>
    </Dropdown>
  );

  return (
    <div style={{ padding: '16px 24px', height: 'calc(100vh - 58px)', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>{columnsMenu}</Space>
        <Space>
          {searchMenu}
          <Input
            placeholder="Поиск"
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            style={{ width: 350 }}
            size="large"
            onPressEnter={() => { setPage(1); setSearch(searchInput); }}
          />
          <Button type="primary" icon={<SearchOutlined />} size="large" onClick={() => { setPage(1); setSearch(searchInput); }} style={{height: 38}}>
          </Button>
        </Space>
      </Space>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          border: '1px solid #f0f0f0',
          borderRadius: 6,
          overflow: 'auto',
          background: '#fff',
        }}
      >
        <Table
          loading={loading}
          columns={columns}
          dataSource={data}
          rowKey={(r: any) => String(r.id)}
          pagination={false}
          size="small"
          sticky
        />
      </div>

      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          pageSizeOptions={['10', '20', '50', '100', '200']}
          onChange={(p) => setPage(p)}
          onShowSizeChange={(_, size) => { setPageSize(size); setPage(1); }}
          showTotal={(t, r) => `${r[0]}-${r[1]} из ${t}`}
          size="small"
        />
      </div>
    </div>
  );
}
