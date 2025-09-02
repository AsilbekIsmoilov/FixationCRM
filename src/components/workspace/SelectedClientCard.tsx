import React from 'react';
import { Card, Descriptions, Form, Select, Input, Space, Button, message } from 'antd';
import { useRecordsStore } from '../../store/recordsStore';
import { CallMeta, RawRecord } from '../../types/records';

// Опции строго соответствуют типам CallMeta
const callStatusOptions: CallMeta['callStatus'][] = ['Дозвонился','Не дозвонился','Не звонили'];
const callResultOptions: CallMeta['callResult'][] = [
  'Ответили на вопрос','Отказ от разговора','Другой владелец номера','Нет ответа','Аппарат выключен','Номер не существует','Дубликат номера','Статус Активный'
];
const subscriberAnswerOptions: CallMeta['subscriberAnswer'][] = [
  'Временно нет потребности в интернете','Финансовые трудности','Забыли внести платеж','Высокая стоимость ТП','Не устраивает качество сети','Плохое обслуживание','Переезд','Смена технологии','Смена провайдера','Абонент активный','Оплатит в скором времени'
];

interface FormExtra {
  technology?: string;
  branch?: string;
}

export const SelectedClientCard: React.FC = () => {
  const selected = useRecordsStore(s => s.selectedRecord as RawRecord | null);
  const saveServiced = useRecordsStore(s => s.saveServiced);
  const records = useRecordsStore(s => s.records as RawRecord[]);
  const [form] = Form.useForm<Partial<CallMeta & FormExtra>>();

  const techOptions = React.useMemo(
    () => Array.from(new Set(records.map(r => r.TECHNOLOGY).filter(Boolean))).map(v => ({ value: String(v), label: String(v) })),
    [records]
  );
  const branchOptions = React.useMemo(
    () => Array.from(new Set(records.map(r => r.BRANCH).filter(Boolean))).map(v => ({ value: String(v), label: String(v) })),
    [records]
  );

  React.useEffect(() => {
    if (selected) {
      form.resetFields();
    } else {
      form.resetFields();
    }
  }, [selected, form]);

  const onSave = async () => {
    if (!selected) return;
    try {
      const values = await form.validateFields();
      const meta: CallMeta = {
        callStatus: values.callStatus!,
        callResult: values.callResult!,
        subscriberAnswer: values.subscriberAnswer || 'Абонент активный',
        note: values.note?.trim() || undefined,
      };
      saveServiced(meta, {
        TECHNOLOGY: values.technology ?? selected.TECHNOLOGY,
        BRANCH: values.branch ?? selected.BRANCH,
      });
      message.success('Сохранено');
      form.resetFields();
    } catch {
      // Ошибки валидации показываются автоматически
    }
  };

  const onClear = () => form.resetFields();

  if (!selected) return (
    <Card title="Карточка клиента" size="small" style={{ height: 'fit-content' }}>
      Выберите запись
    </Card>
  );

  const clientName = selected.CLIENT || selected.FULL_NAME || '';
  const msisdn = selected.MSISDN || selected.PHONE || '';
  const balance = selected.BALANCE ?? selected['Баланс'] ?? '';
  const statusDays = selected.DAYS_IN_STATUS ?? selected['Дней в статусе'] ?? '';

  return (
    <Card title="Карточка клиента" size="small" style={{ height: 'fit-content' }}>
      <Space direction="vertical" style={{ width: '100%' }} size={8}>
        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="CLIENT">{String(clientName)}</Descriptions.Item>
            <Descriptions.Item label="MSISDN">{String(msisdn)}</Descriptions.Item>
            <Descriptions.Item label="Баланс">{String(balance)}</Descriptions.Item>
            <Descriptions.Item label="Дней в статусе">{String(statusDays)}</Descriptions.Item>
            <Descriptions.Item label="Департамент">{String(selected.DEPARTMENT || '-')}</Descriptions.Item>
            <Descriptions.Item label="Технология">{String(selected.TECHNOLOGY || '-')}</Descriptions.Item>
            <Descriptions.Item label="Филиал">{String(selected.BRANCH || '-')}</Descriptions.Item>
            <Descriptions.Item label="Дата списания АП">{String(selected.AP_WRITE_OFF_DATE || '-')}</Descriptions.Item>
            <Descriptions.Item label="Абон плата">{String(selected.MONTHLY_FEE || '-')}</Descriptions.Item>
        </Descriptions>

        <Form form={form} layout="vertical" size="small">
          <Form.Item name="technology" label="Технология">
            <Select allowClear showSearch placeholder="Выберите технологию" options={techOptions} />
          </Form.Item>
          <Form.Item name="branch" label="Филиал">
            <Select allowClear showSearch placeholder="Выберите филиал" options={branchOptions} />
          </Form.Item>
          <Form.Item name="callStatus" label="* Статус звонка" rules={[{ required: true, message: 'Укажите статус звонка' }]}>
            <Select placeholder="Статус звонка" options={callStatusOptions.map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="callResult" label="* Результат обзвона" rules={[{ required: true, message: 'Укажите результат' }]}>
            <Select placeholder="Результат" options={callResultOptions.map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="subscriberAnswer" label="Ответ абонента">
            <Select allowClear placeholder="Ответ абонента" options={subscriberAnswerOptions.map(v => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="note" label="Примечание">
            <Input.TextArea placeholder="Дополнительная информация" rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>

        <Space>
          <Button type="primary" onClick={onSave} size="small">Сохранить</Button>
          <Button onClick={onClear} size="small">Очистить</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default SelectedClientCard;
