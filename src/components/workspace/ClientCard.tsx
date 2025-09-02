import React from 'react';
import { Card, Descriptions, Form, Select, Input, Space, Button, message } from 'antd';
import { useRecordsStore } from '../../store/recordsStore';
import { CallMeta, RawRecord } from '../../types/records';

const callStatusOptions: CallMeta['callStatus'][] = ['Дозвонился','Не дозвонился','Не звонили'];
const callResultOptions: CallMeta['callResult'][] = [
  'Ответили на вопрос','Отказ от разговора','Другой владелец номера','Нет ответа','Аппарат выключен','Номер не существует','Дубликат номера','Статус Активный'
];
const subscriberAnswerOptions: CallMeta['subscriberAnswer'][] = [
  'Временно нет потребности в интернете','Финансовые трудности','Забыли внести платеж','Высокая стоимость ТП','Не устраивает качество сети','Плохое обслуживание','Переезд','Смена технологии','Смена провайдера','Абонент активный','Оплатит в скором времени'
];

interface FormExtra { technology?: string; branch?: string; }

const ClientCard: React.FC = () => {
  const selected = useRecordsStore(s => s.selectedRecord as RawRecord | null);
  const saveServiced = useRecordsStore(s => s.saveServiced);
  const records = useRecordsStore(s => s.records as RawRecord[]);
  const [form] = Form.useForm<Partial<CallMeta & FormExtra>>();

  const techOptions = React.useMemo(() => Array.from(new Set(records.map(r => r.TECHNOLOGY).filter(Boolean))).map(v => ({ value: String(v), label: String(v) })), [records]);
  const branchOptions = React.useMemo(() => Array.from(new Set(records.map(r => r.BRANCH).filter(Boolean))).map(v => ({ value: String(v), label: String(v) })), [records]);

  React.useEffect(() => { form.resetFields(); }, [selected, form]);

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
    } catch {}
  };

  if (!selected) return <Card title="Карточка клиента" size="small">Выберите запись</Card>;

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
          <Descriptions.Item label="Технология">{String(selected.TECHNOLOGY || '-')}</Descriptions.Item>
          <Descriptions.Item label="Филиал">{String(selected.BRANCH || '-')}</Descriptions.Item>
        </Descriptions>
        <Form form={form} layout="vertical" size="small">
          <Form.Item name="technology" label="Технология"><Select allowClear showSearch options={techOptions} /></Form.Item>
          <Form.Item name="branch" label="Филиал"><Select allowClear showSearch options={branchOptions} /></Form.Item>
          <Form.Item name="callStatus" label="* Статус звонка" rules={[{ required: true }]}><Select options={callStatusOptions.map(v => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="callResult" label="* Результат обзвона" rules={[{ required: true }]}><Select options={callResultOptions.map(v => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="subscriberAnswer" label="Ответ абонента"><Select allowClear options={subscriberAnswerOptions.map(v => ({ value: v, label: v }))} /></Form.Item>
          <Form.Item name="note" label="Примечание"><Input.TextArea rows={2} maxLength={500} showCount /></Form.Item>
        </Form>
        <Space>
          <Button type="primary" size="small" onClick={onSave}>Сохранить</Button>
          <Button size="small" onClick={() => form.resetFields()}>Очистить</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default ClientCard;
export { ClientCard };
