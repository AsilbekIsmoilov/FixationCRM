import React, { useMemo, useState } from 'react';
import { Button, Dropdown, MenuProps, Space, Table, Checkbox, Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useRecordsStore } from '../../store/recordsStore';
import { RawRecord } from '../../types/records';

const ClientTable: React.FC = () => {
  const records = useRecordsStore((s: any) => s.records);
  const selectRecord = useRecordsStore((s: any) => s.selectRecord);
  const selected = useRecordsStore((s: any) => s.selectedRecord);
  const visibleColumns = useRecordsStore((s: any) => s.visibleColumns);
  const setVisibleColumns = useRecordsStore((s: any) => s.setVisibleColumns);

  console.log('ClientTable - records:', records);
  console.log('ClientTable - visibleColumns:', visibleColumns);

  const [searchText, setSearchText] = useState('');

  const [filterText, setFilterText] = useState<Record<string, string>>({});

  // Фильтрация по поисковому запросу
  const filteredRecords = useMemo(() => {
    if (!searchText) return records;
    
    return records.filter((record: any) => {
      const searchLower = searchText.toLowerCase();
      // Поиск по номеру абонента, MSISDN, CLIENT (ФИО)
      const msisdn = String(record.MSISDN || '').toLowerCase();
      const client = String(record.CLIENT || '').toLowerCase();
      const branches = String(record.BRANCHES || '').toLowerCase();
      
      return msisdn.includes(searchLower) || 
             client.includes(searchLower) || 
             branches.includes(searchLower);
    });
  }, [records, searchText]);

  const allKeys = useMemo(() => visibleColumns, [visibleColumns]);

  const columns = useMemo(() => allKeys.filter((k: any) => visibleColumns.includes(k)).map((key: any) => ({
    title: key,
    dataIndex: key,
    key,
    filteredValue: filterText[key] ? [filterText[key]] : null,
    onFilter: (value: any, record: any) => String(record[key] ?? '').toLowerCase().includes(String(value).toLowerCase()),
    sorter: (a: any, b: any) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')),
  })), [allKeys, filterText, visibleColumns]);

  const colSelectorMenu: MenuProps['items'] = [
    {
      key: 'cols',
      label: (
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          {allKeys.map((k: any) => (
            <div key={k}>
              <Checkbox
                checked={visibleColumns.includes(k)}
                onChange={(e) => {
                  if (e.target.checked) setVisibleColumns([...visibleColumns, k]);
                  else setVisibleColumns(visibleColumns.filter((c: any) => c !== k));
                }}
              >{k}</Checkbox>
            </div>
          ))}
        </div>
      )
    }
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Space>
        <Input.Search
          placeholder="Поиск по номеру, MSISDN или клиенту"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
        <Dropdown trigger={['click']} menu={{ items: colSelectorMenu }}>
          <Button>Колонки</Button>
        </Dropdown>
      </Space>
      <Table
        size="small"
        rowKey="id"
        dataSource={filteredRecords}
        columns={[...columns, {
          title: 'Действия',
          key: 'actions',
          width: 80,
          render: (_: any, record: RawRecord) => (
            <Button 
              type={selected?.id === record.id ? 'primary' : 'default'} 
              size="small"
              onClick={() => selectRecord(record.id)}
            >
              Выбрать
            </Button>
          )
        }]}
        pagination={{ pageSize: 15, size: 'small' }}
        rowClassName={(r) => r.id === selected?.id ? 'selected-row' : ''}
        scroll={{ x: 'max-content', y: 'calc(100vh - 260px)' }}
      />
    </Space>
  );
};

export default ClientTable;
