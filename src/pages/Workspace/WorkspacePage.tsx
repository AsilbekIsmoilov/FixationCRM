import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, Input, Button, Space, Dropdown, Checkbox, Pagination, Divider } from 'antd';
import { SearchOutlined, SettingOutlined, FilterOutlined } from '@ant-design/icons';
import { useRecordsStore } from '../../store/recordsStore';
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

const DEFAULT_COLUMNS = ['msisdn', 'branches', 'client', 'account', 'status', 'phone','status_call'];

const ALL_SEARCH_FIELDS = ['client', 'account', 'msisdn', 'phone'] as const;
type SearchField = typeof ALL_SEARCH_FIELDS[number];
const DEFAULT_SEARCH_FIELDS: SearchField[] = ['phone'];

function makeUserPrefix(user: { id?: number; username?: string } | null) {
  const savedUname = localStorage.getItem('last_login_username') || 'guest';
  if (user?.id) return `cccrm:u:${user.id}`;
  if (user?.username) return `cccrm:uname:${user.username}`;
  return `cccrm:uname:${savedUname}`;
}

const REFRESH_FLAG = 'cccrm:refresh_suspends';

const WorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const { user } = useAuthStore();
  const prefix = useMemo(() => makeUserPrefix(user), [user]);
  const COLS_KEY = `${prefix}:visible_columns_v1`;
  const SEARCH_KEY = `${prefix}:last_search_v1`;

  const { records, total, loading, visibleColumns, setVisibleColumns, fetchActives } = useRecordsStore();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchColumns, setSearchColumns] = useState<SearchField[]>(DEFAULT_SEARCH_FIELDS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [ordering] = useState<string>('-created_at');

  const DATE_FIELDS = new Set([
    'status_from',
    'write_offs_date',
    'fixed_at',
    'called_at',
    'created_at',
    'updated_at',
  ]);

  const allColumns = useMemo(() => (records[0] ? Object.keys(records[0]) : []), [records]);

  // init columns
  const colsInitRef = useRef(false);
  useEffect(() => {
    if (colsInitRef.current) return;
    colsInitRef.current = true;
    let saved: string[] | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(COLS_KEY) || '[]');
    } catch {
      saved = null;
    }
    const initial = Array.isArray(saved) && saved.length ? saved : DEFAULT_COLUMNS;
    setVisibleColumns(initial);
    localStorage.setItem(COLS_KEY, JSON.stringify(initial));
  }, [COLS_KEY, setVisibleColumns]);

  useEffect(() => {
    if (!allColumns.length || !visibleColumns.length) return;
    const intersect = visibleColumns.filter((c) => allColumns.includes(c));
    if (intersect.length !== visibleColumns.length || intersect.some((c, i) => c !== visibleColumns[i])) {
      setVisibleColumns(intersect);
      localStorage.setItem(COLS_KEY, JSON.stringify(intersect));
    }
  }, [allColumns, visibleColumns, setVisibleColumns, COLS_KEY]);

  useEffect(() => {
    localStorage.setItem(COLS_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns, COLS_KEY]);

  // init search (URL + LS)
  const searchInitRef = useRef(false);
  useEffect(() => {
    if (searchInitRef.current) return;
    searchInitRef.current = true;

    const q = params.get('q');
    const p = Number(params.get('page') || 1);
    const ps = Number(params.get('ps') || 50);
    const by = params.get('by');

    let initialized = false;

    if (by) {
      const parsed = by
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is SearchField => (ALL_SEARCH_FIELDS as readonly string[]).includes(s));
      if (parsed.length) setSearchColumns(parsed);
      else setSearchColumns(DEFAULT_SEARCH_FIELDS);
    }

    if (q && q.length >= 4) {
      setSearchInput(q);
      setSearch(q);
      setPage(isNaN(p) ? 1 : p);
      setPageSize(isNaN(ps) ? 50 : ps);
      initialized = true;
    }

    if (!initialized) {
      try {
        const saved = JSON.parse(localStorage.getItem(SEARCH_KEY) || 'null');
        if (saved?.q && String(saved.q).length >= 4) {
          setSearchInput(saved.q);
          setSearch(saved.q);
          setPage(Number(saved.page) || 1);
          setPageSize(Number(saved.ps) || 50);
          if (Array.isArray(saved.by)) {
            setSearchColumns(
              saved.by.filter((s: string) => (ALL_SEARCH_FIELDS as readonly string[]).includes(s)) as SearchField[],
            );
          } else {
            setSearchColumns(DEFAULT_SEARCH_FIELDS);
          }
        } else {
          setSearchInput('');
          setSearch('');
          setPage(1);
          setPageSize(50);
          setSearchColumns(DEFAULT_SEARCH_FIELDS);
        }
      } catch {
        setSearchColumns(DEFAULT_SEARCH_FIELDS);
      }
    }
  }, [SEARCH_KEY, params]);

  useEffect(() => {
    const q = search.trim();
    if (!q || q.length < 4) {
      setParams({}, { replace: true });
      localStorage.removeItem(SEARCH_KEY);
      return;
    }
    const next = new URLSearchParams();
    next.set('q', q);
    next.set('page', String(page));
    next.set('ps', String(pageSize));
    next.set('ord', ordering);
    next.set('by', searchColumns.join(','));
    setParams(next, { replace: true });

    localStorage.setItem(
      SEARCH_KEY,
      JSON.stringify({ q, page, ps: pageSize, ord: ordering, by: searchColumns }),
    );
  }, [search, page, pageSize, ordering, searchColumns, setParams, SEARCH_KEY]);

  const doFetch = React.useCallback(() => {
    const q = search.trim();
    if (q.length < 4) return;
    if (searchColumns.length === 0) return;
    fetchActives({ q, ordering, page, page_size: pageSize, fields: searchColumns });
  }, [search, searchColumns, ordering, page, pageSize, fetchActives]);

  useEffect(() => { doFetch(); }, [doFetch]);

  useEffect(() => {
    const handler = () => {
      const flag = sessionStorage.getItem(REFRESH_FLAG);
      if (flag) {
        sessionStorage.removeItem(REFRESH_FLAG);
        doFetch();
      }
    };
    window.addEventListener('focus', handler);
    window.addEventListener('pageshow', handler);
    return () => {
      window.removeEventListener('focus', handler);
      window.removeEventListener('pageshow', handler);
    };
  }, [doFetch]);

const dataToShow = useMemo(() => {
  if (!search.trim() || search.trim().length < 4) return [];
  if (searchColumns.length === 0) return [];
  return records || [];
}, [search, searchColumns, records]);

  const columnTitles: Record<string, string> = {
    id: 'ID',
    msisdn: 'MSISDN',
    departments: 'Отделы',
    status_from: 'Статус от',
    client: 'Клиент',
    rate_plan: 'Тариф',
    balance: 'Баланс',
    subscription_fee: 'Абонентская плата',
    account: 'Лицевой счёт',
    branches: 'Филиалы',
    status: 'Статус',
    phone: 'Номер абонента',
    status_call: 'Статус звонка',
    call_result: 'Результат обзвона',
    abonent_answer: 'Ответ абонента',
    note: 'Примечание',
    tech: 'Технология',
    created_at: 'Дата создания',
    updated_at: 'Дата обновления',
    called_by: 'Кто обслужил',
    called_by_id: 'ID оператора',
    called_at: 'Дата обзвона',
    days_in_status: 'Дней в статусе',
    write_offs_date: 'Дата списания',
    source: "Fixed/Suspend"
  };

  const columns = useMemo(() => {
    const cols = visibleColumns
      .filter((col) => !allColumns.length || allColumns.includes(col))
      .map((col) => ({
        title: columnTitles[col] || col,
        dataIndex: col,
        key: col,
        sorter: (a: any, b: any) => (a[col] || '').toString().localeCompare((b[col] || '').toString()),
        ellipsis: true,
        render: DATE_FIELDS.has(col) ? (v: any) => fmtDate(v) : undefined,
      }));

    const actions = {
      title: 'Действия',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_: any, record: any) => {
        const isFixeds = record?.source === 'fixeds';      
        const processed = Boolean(record?.called_by ?? record?.fixed_by);

        const label = isFixeds ? 'Открыть' : (processed ? 'Открыть' : 'Выбрать');
        const src = isFixeds ? 'fixeds' : 'suspends';

        return (
          <Button
            size="middle"
            type={label === 'Выбрать' ? 'primary' : 'default'}
            style={{
              ...ACTION_BTN_BASE,
              background: label === 'Выбрать' ? ACTION_COLORS.chooseBg : '#fff',
              color: label === 'Выбрать' ? ACTION_COLORS.chooseText : ACTION_COLORS.editText,
              borderColor: label === 'Выбрать' ? ACTION_COLORS.chooseBg : ACTION_COLORS.editBorder,
              borderWidth: 2,
            }}
            onClick={() => navigate(`/workspace/client/${record.id}?src=${src}`)}
          >
            {label}
          </Button>
        );
      },
    };

    return [...cols, actions];
  }, [allColumns, visibleColumns, navigate]);

  const setDefaultCols = () => {
    setVisibleColumns(DEFAULT_COLUMNS);
    localStorage.setItem(COLS_KEY, JSON.stringify(DEFAULT_COLUMNS));
  };
  const setAllCols = () => {
    const next = allColumns.length ? [...allColumns] : DEFAULT_COLUMNS;
    setVisibleColumns(next);
    localStorage.setItem(COLS_KEY, JSON.stringify(next));
  };
  const clearAllCols = () => {
    setVisibleColumns([]);
    localStorage.setItem(COLS_KEY, JSON.stringify([]));
  };

  const chosenCount = useMemo(
    () => (allColumns.length ? visibleColumns.filter((c) => allColumns.includes(c)).length : visibleColumns.length),
    [visibleColumns, allColumns],
  );

  const columnsMenu = (
    <Dropdown
      overlay={
        <div
          style={{
            padding: 16,
            minWidth: 280,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          }}
        >
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
              onChange={(vals) => {
                setVisibleColumns(vals as string[]);
                localStorage.setItem(COLS_KEY, JSON.stringify(vals));
              }}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {(allColumns.length ? allColumns : DEFAULT_COLUMNS).map((col) => (
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
        <div
          style={{
            padding: 16,
            minWidth: 260,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600 }}>Поиск по столбцам</div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Button size="small" type="primary" onClick={() => setSearchColumns(DEFAULT_SEARCH_FIELDS)}>По умолчанию</Button>
            <Button size="small" onClick={() => setSearchColumns([...ALL_SEARCH_FIELDS])}>Все</Button>
            <Button size="small" onClick={() => setSearchColumns([])}>Сбросить</Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <Checkbox.Group
            value={searchColumns}
            onChange={(vals) => setSearchColumns(vals as SearchField[])}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {ALL_SEARCH_FIELDS.map((col) => (
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
    <div
      style={{
        padding: '16px 24px',
        height: 'calc(100vh - 58px)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Space>{columnsMenu}</Space>
        <Space>
          {searchMenu}
          <Input
            placeholder="Поиск (минимум 4 символа)"
            prefix={<SearchOutlined />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            allowClear
            style={{ width: 350 }}
            size="large"
            onPressEnter={() => { setPage(1); setSearch(searchInput); }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="large"
            onClick={() => { setPage(1); setSearch(searchInput); }}
            style={{ height: 38 }}
          />
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
        {!search.trim() || search.trim().length < 4 ? (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
            Введите минимум 4 символа для поиска
          </div>
        ) : searchColumns.length === 0 ? (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8c8c8c' }}>
            Выберите хотя бы один столбец для поиска
          </div>
        ) : (
          <Table
            loading={loading}
            columns={columns}
            dataSource={dataToShow}
            rowKey={(r: any) => String(r.id)}
            pagination={false}
            size="small"
            sticky
          />
        )}
      </div>

      {search.trim() && search.trim().length >= 4 && searchColumns.length > 0 && (
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
      )}
    </div>
  );
};

export default WorkspacePage;
