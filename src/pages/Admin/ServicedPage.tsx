
import React, { useState, useMemo } from 'react';
import { Table, Input, Button, Space, Dropdown, Checkbox, Divider, Pagination, Tooltip } from 'antd';
import { SearchOutlined, SettingOutlined, FilterOutlined } from '@ant-design/icons';
import { useRecordsStore } from '../../store/recordsStore';

const ServicedPage: React.FC = () => {
  const serviced = useRecordsStore(s => s.serviced);
  const [search, setSearch] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>(['CLIENT', 'ACCOUNT', 'MSISDN', 'PHONE', 'callMeta.callStatus']);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Собираем все возможные ключи, включая callMeta и servicedAt

  const allColumns = useMemo(() => {
    if (!serviced.length) return [];
    // Собираем все ключи, кроме callMeta и servicedAt
    const base = Object.keys(serviced[0] || {}).filter(k => k !== 'callMeta' && k !== 'servicedAt' && k !== 'operator');
    // Добавим callMeta поля явно
    const metaFields = ['callMeta.callStatus', 'callMeta.callResult', 'callMeta.subscriberAnswer', 'callMeta.note'];
    // Добавим 'operator' и 'servicedAt' в конец
    return [...base, ...metaFields, 'operator', 'servicedAt'];
  }, [serviced]);

  const defaultColumns = [
    'BRANCHES',
    'RATE_PLAN',
    'CLIENT',
    'Абон плата',
    'MSISDN',
    'PHONE',
    'callMeta.callStatus',
    'callMeta.callResult',
    'callMeta.subscriberAnswer',
    'callMeta.note',
    'operator',
    'servicedAt',
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumns);

  // Убираем автоматическую инициализацию visibleColumns, чтобы сброс работал корректно

  const columnTitles: { [key: string]: string } = {
    BRANCHES: 'BRANCHES',
    DEPARTMENTS: 'DEPARTMENTS',
    'Дата с которой': 'Дата с которой',
    'Дата с которой Статус': 'Дата с которой Статус',
    'Дней в стат.': 'Дней в стат.',
    'Дата Списания АП': 'Дата Списания АП',
    CLIENT: 'CLIENT',
    RATE_PLAN: 'RATE_PLAN',
    'Баланс': 'Баланс',
    'Абон плата': 'Абон плата',
    ACCOUNT: 'ACCOUNT',
    MSISDN: 'MSISDN',
    'Статус': 'Статус',
    PHONE: 'PHONE',
    id: 'Id',
    'callMeta.callStatus': 'Статус звонка',
    'callMeta.callResult': 'Результат обзвона',
    'callMeta.subscriberAnswer': 'Ответ абонента',
    'callMeta.note': 'Примечание',
  operator: 'Кто обслужил',
  servicedAt: 'Дата обслуживания',
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return serviced;
    const s = search.toLowerCase();
    return serviced.filter(r =>
      searchColumns.some(col => {
        if (col.startsWith('callMeta.')) {
          const metaKey = col.replace('callMeta.', '') as 'callStatus' | 'callResult' | 'subscriberAnswer' | 'note';
          return (r.callMeta?.[metaKey] || '').toString().toLowerCase().includes(s);
        }
        return (r[col] || '').toString().toLowerCase().includes(s);
      })
    );
  }, [serviced, search, searchColumns]);

  const columns = useMemo(() => {
    const baseColumns = visibleColumns.map(col => {
      let render = (value: any, record: any) => value;
      let width;
      if (col === 'CLIENT' || col === 'ACCOUNT' || col === 'MSISDN' || col === 'PHONE') {
        render = (text: string) => {
          if (!text) return '-';
          const short = text.length > 30 ? text.slice(0, 30) + '…' : text;
          return (
            <Tooltip title={text} placement="topLeft">
              <span>{short}</span>
            </Tooltip>
          );
        };
        width = 70;
      } else if (col === 'callMeta.subscriberAnswer' || col === 'callMeta.note') {
        render = (_: any, r: any) => {
          const text = r.callMeta?.[col.replace('callMeta.', '')] ?? '-';
          if (!text) return '-';
          const short = text.length > 20 ? text.slice(0, 20) + '…' : text;
          return (
            <Tooltip title={text} placement="topLeft">
              <span>{short}</span>
            </Tooltip>
          );
        };
        width = 70;
      } else if (col.startsWith('callMeta.')) {
        const metaKey = col.replace('callMeta.', '') as 'callStatus' | 'callResult' | 'subscriberAnswer' | 'note';
        render = (_: any, r: any) => r.callMeta?.[metaKey] ?? '-';
      } else if (col === 'servicedAt') {
        render = (_: any, r: any) => r.servicedAt ? new Date(r.servicedAt).toLocaleString() : '-';
      } else if (col === 'operator') {
        render = (_: any, r: any) => {
          const text = r.operator || '-';
          if (!text) return '-';
          const short = text.length > 15 ? text.slice(0, 15) + '…' : text;
          return (
            <Tooltip title={text} placement="topLeft">
              <span>{short}</span>
            </Tooltip>
          );
        };
        width = 60; // сокращено примерно на 20%
      }
      return {
        title: columnTitles[col] || col,
        dataIndex: col.includes('.') ? undefined : col,
        key: col,
        render,
        ellipsis: true,
        ...(width ? { width } : {}),
      };
    });
    // Добавляем колонку действий
    baseColumns.push({
      title: 'Действия',
      key: 'actions',
      dataIndex: undefined,
      width: 90,
      ellipsis: false,
      render: (_: any, record: any) => (
        <Button size="small" type="default" className="edit-btn" style={{ fontSize: 13 }} onClick={() => alert(`Редактировать: ${record.id || record.MSISDN || record.CLIENT}`)}>
          Редактировать
        </Button>
      ),
    });
    return baseColumns;
  }, [visibleColumns, columnTitles]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
        <Dropdown
          overlay={
            <div style={{ padding: 16, minWidth: 280, background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#262626' }}>Настройка колонок</div>
              <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button size="small" type="primary" onClick={() => setVisibleColumns(allColumns)} style={{ fontSize: 12, height: 28, borderRadius: 6 }}>Все</Button>
                <Button size="small" onClick={() => setVisibleColumns([])} style={{ fontSize: 12, height: 28, borderRadius: 6 }}>Сбросить</Button>
                <Button size="small" onClick={() => setVisibleColumns(defaultColumns)} style={{ fontSize: 12, height: 28, borderRadius: 6 }}>По умолчанию</Button>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                <Checkbox.Group value={visibleColumns} onChange={vals => setVisibleColumns(vals as string[])} style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {allColumns.map(col => (
                      <Checkbox key={col} value={col} style={{ fontSize: 13, padding: '4px 0', width: '100%', margin: 0 }}>
                        <span style={{ color: '#595959' }}>{columnTitles[col] || col}</span>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'center' }}>Выбрано: {visibleColumns.length} из {allColumns.length}</div>
            </div>
          }
          trigger={['click']}
          placement="bottomLeft"
        >
          <Button icon={<SettingOutlined />}>Колонки ({visibleColumns.length}/{allColumns.length})</Button>
        </Dropdown>
        <Space>
          <Dropdown
            overlay={
              <div style={{ padding: 16, minWidth: 250, maxHeight: 400, overflowY: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12), 0 9px 28px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: '#262626' }}>Поиск по столбцам</div>
                <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button size="small" type="primary" onClick={() => setSearchColumns(allColumns)} style={{ fontSize: 12, height: 28, borderRadius: 6 }}>Все</Button>
                  <Button size="small" onClick={() => setSearchColumns([])} style={{ fontSize: 12, height: 28, borderRadius: 6 }}>Сбросить</Button>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <Checkbox.Group value={searchColumns} onChange={vals => setSearchColumns(vals as string[])} style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {allColumns.map(col => (
                      <Checkbox key={col} value={col} style={{ fontSize: 13, padding: '4px 0', width: '100%', margin: 0 }}>
                        <span style={{ color: '#595959' }}>{columnTitles[col] || col}</span>
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 12, color: '#8c8c8c', textAlign: 'center' }}>Выбрано: {searchColumns.length} из {allColumns.length}</div>
              </div>
            }
            trigger={['click']}
            placement="bottomLeft"
          >
            <Button icon={<FilterOutlined />}>Поиск по ({searchColumns.length}/{allColumns.length})</Button>
          </Dropdown>
          <Input
            placeholder={`Поиск по: ${searchColumns.map(col => columnTitles[col] || col).join(', ')}`}
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            style={{ width: 350, fontSize: 15 }}
            size="large"
            disabled={searchColumns.length === 0}
          />
        </Space>
      </Space>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden', background: '#fff', minHeight: 540, display: 'flex', flexDirection: 'column' }}>
        <Table
          columns={columns}
          dataSource={paged}
          rowKey={(_r, idx) => String(_r.id || _r.MSISDN || _r.CLIENT || idx)}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content', y: 700 }}
          style={{ background: '#fff', minHeight: 700 }}
        />
        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filtered.length}
            showSizeChanger
            pageSizeOptions={['10', '20', '50', '100', '200']}
            onChange={setPage}
            onShowSizeChange={(_, size) => { setPageSize(size); setPage(1); }}
            showTotal={(total, range) => `${range[0]}-${range[1]} из ${total}`}
            size="small"
            style={{ marginLeft: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ServicedPage;
