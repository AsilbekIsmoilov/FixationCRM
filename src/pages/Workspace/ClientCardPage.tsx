// src/pages/Workspace/ClientCardPage.tsx
import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fmtDate } from '../../utils/format';
import {
  Card, Row, Col, Form, Select, Input, Button, Typography, Skeleton, message, Space,
} from 'antd';
import { LeftOutlined, SaveOutlined } from '@ant-design/icons';
import { actives, suspends, fixeds } from '../../store/api';

type Src = 'suspends' | 'fixeds' | 'actives';

type Active = {
  id: number;
  client?: string;
  msisdn?: string;
  phone?: string;
  account?: string;
  rate_plan?: string;
  balance?: string | number;
  subscription_fee?: string | number;
  branches?: string;
  departments?: string;
  status?: string;
  status_from?: string;
  days_in_status?: number;
  write_offs_date?: string;

  status_call?: string;
  call_result?: string;
  abonent_answer?: string;
  note?: string;

  called_by?: string;   // отображаемое имя оператора
  called_at?: string;   // дата фиксации
};

const { Title } = Typography;
const { TextArea } = Input;

const HINT_STATUS_CALL = ['Дозвонился', 'Не дозвонился', 'Не звонили'];
const HINT_CALL_RESULT = [
  'Нет ответа','Ответили на вопрос','Отказ от разговора','Другой владелец номера',
  'Аппарат выкл','Номер не существует','Дубликат номера','Статус активный',
];
const HINT_ABONENT_ANSWER = [
  'Нет ответа','Временно нет потребности в интернете','Финансовые трудности','Забыли внести платеж',
  'Высокая стоимость ТП','Не устраивает качество сети','Плохое обслуживание','Переезд',
  'Смена технологии','Смена провайдера','Абонент активный','Оплатит в скором времени','Другой',
];

const LABEL_COLOR = '#111';
const VALUE_COLOR = '#111';
const GREEN = '#52c41a';
const RED = '#ff4d4f';

function InfoItem({ label, value }: { label: React.ReactNode; value?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: LABEL_COLOR, fontWeight: 600 }}>{label}</div>
      <div style={{ color: VALUE_COLOR }}>{value ?? '-'}</div>
    </div>
  );
}

const REFRESH_FLAG = 'cccrm:refresh_suspends';

// Приведение данных Fixeds под формат карточки
function normalizeRecord(src: Src, data: any): Active {
  if (src === 'fixeds') {
    return {
      ...data,
      called_by: data.fixed_by_label || '',
      called_at: data.fixed_at,
    };
  }
  return data;
}

const ClientCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // источник из query (?src=...) — только подсказка порядка поиска
  const srcQuery = (searchParams.get('src') || '').toLowerCase();
  const preferred: Src[] =
    srcQuery === 'fixeds' ? ['fixeds', 'suspends', 'actives']
  : srcQuery === 'actives' ? ['actives', 'suspends', 'fixeds']
  : /* default */         ['suspends', 'fixeds', 'actives'];

  // Режим страницы: edit / view
  const [mode, setMode] = React.useState<'edit' | 'view'>('edit');
  const [usedSrc, setUsedSrc] = React.useState<Src | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [rec, setRec] = React.useState<Active | null>(null);
  const [form] = Form.useForm();
  const submitLockRef = React.useRef(false);

  // Загрузка карточки: пробуем suspends -> fixeds -> actives (или в другом порядке, согласно query)
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        const apis: Record<Src, any> = { suspends, fixeds, actives };

        let loaded: Active | null = null;
        let from: Src | null = null;
        let lastErr: any = null;

        for (const src of preferred) {
          try {
            const data = await apis[src].retrieve(id!);
            loaded = normalizeRecord(src, data);
            from = src;
            break;
          } catch (e: any) {
            lastErr = e;
            if (e?.status === 404) continue; // если нет в этом источнике — пробуем следующий
            throw e;                          // иные ошибки — вылетаем
          }
        }

        if (!mounted) return;

        if (!loaded || !from) {
          throw lastErr || new Error('Запись не найдена ни в Suspends, ни в Fixeds');
        }

        // Логика режима:
        // - из Suspends — редактирование
        // - из Fixeds — редактирование ТОЛЬКО если status_call === 'Не дозвонился'
        const canEdit =
          from === 'suspends' ||
          (from === 'fixeds' && loaded.status_call === 'Не дозвонился');

        setMode(canEdit ? 'edit' : 'view');
        setUsedSrc(from);
        setRec(loaded);

        // Опции и значения формы
        const sc = [...HINT_STATUS_CALL];
        const cr = [...HINT_CALL_RESULT];
        const aa = [...HINT_ABONENT_ANSWER];
        if (loaded.status_call && !sc.includes(loaded.status_call)) sc.unshift(loaded.status_call);
        if (loaded.call_result && !cr.includes(loaded.call_result)) cr.unshift(loaded.call_result);
        if (loaded.abonent_answer && !aa.includes(loaded.abonent_answer)) aa.unshift(loaded.abonent_answer);

        form.setFieldsValue({
          status_call: loaded.status_call,
          call_result: loaded.call_result,
          abonent_answer: loaded.abonent_answer,
          note: loaded.note,
        });
        form.setFields([
          { name: '_sc_opts', value: sc },
          { name: '_cr_opts', value: cr },
          { name: '_aa_opts', value: aa },
        ]);
      } catch (e: any) {
        message.error(e?.payload?.detail || e?.message || 'Не удалось загрузить карточку');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const back = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/workspace');
  };

  // Сохранение: Suspends — через special endpoint fixation; Fixeds — обычный PATCH
  const onSave = async (values: any) => {
    if (mode === 'view') return; // защита
    if (submitLockRef.current || saving) return;
    submitLockRef.current = true;

    try {
      setSaving(true);

      if (usedSrc === 'fixeds') {
        await fixeds.update(id!, {
          status_call: values.status_call,
          call_result: values.call_result,
          abonent_answer: values.abonent_answer,
          note: values.note || '',
        });
      } else {
        // Suspends (и actives, если понадобится) — через fixation
        await suspends.patchFixation(id!, {
          status_call: values.status_call,
          call_result: values.call_result,
          abonent_answer: values.abonent_answer,
          note: values.note || '',
        });
      }

      sessionStorage.setItem(REFRESH_FLAG, String(Date.now()));

      message.success('Сохранено');
      back();
    } catch (e: any) {
      message.error(e?.payload?.detail || e?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
      setTimeout(() => { submitLockRef.current = false; }, 400);
    }
  };

  const scOptions: string[] = form.getFieldValue('_sc_opts') || HINT_STATUS_CALL;
  const crOptions: string[] = form.getFieldValue('_cr_opts') || HINT_CALL_RESULT;
  const aaOptions: string[] = form.getFieldValue('_aa_opts') || HINT_ABONENT_ANSWER;

  const wStatusCall = Form.useWatch('status_call', form);
  const wCallResult = Form.useWatch('call_result', form);
  const wAnswer = Form.useWatch('abonent_answer', form);

  React.useEffect(() => {
    if (mode !== 'edit') return;
    if (wStatusCall === 'Не дозвонился') {
      const { call_result, abonent_answer } = form.getFieldsValue([
        'call_result',
        'abonent_answer',
      ]) as { call_result?: string; abonent_answer?: string };

      const patch: any = {};
      if (!call_result) patch.call_result = 'Нет ответа';
      if (!abonent_answer) patch.abonent_answer = 'Нет ответа';

      if (Object.keys(patch).length) form.setFieldsValue(patch);
    }
  }, [wStatusCall, form, mode]);

  const titleSuffix =
    usedSrc === 'fixeds'
      ? (mode === 'edit' ? " (Редактирование)" : ' (Просмотр)')
      : usedSrc === 'suspends'
        ? ' (Фиксация)'
        : usedSrc === 'actives'
          ? ' (actives)'
          : '';

  return (
    <div style={{ padding: '16px 24px' }}>
      <Space style={{ marginBottom: 12 }}>
        <Button
          type="link"
          icon={<LeftOutlined />}
          onClick={back}
          style={{ paddingLeft: 0, color: '#1677ff', fontSize: 15 }}
        >
          Назад к таблице
        </Button>

        <Title level={4} style={{ margin: 0, fontWeight: 700 }}>
          Карточка клиента{titleSuffix}
        </Title>
      </Space>

      {loading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <Row gutter={16}>
          <Col span={10}>
            <Card title="Информация о клиенте" styles={{ header: { fontWeight: 700 } }}>
              <InfoItem label="Клиент:" value={rec?.client} />
              <Row gutter={12}>
                <Col span={12}><InfoItem label="MSISDN:" value={rec?.msisdn} /></Col>
                <Col span={12}><InfoItem label="Телефон:" value={rec?.phone} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Аккаунт:" value={rec?.account} /></Col>
                <Col span={12}><InfoItem label="Баланс:" value={rec?.balance} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Тарифный план:" value={rec?.rate_plan} /></Col>
                <Col span={12}><InfoItem label="Абон плата:" value={rec?.subscription_fee} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Филиал:" value={rec?.branches} /></Col>
                <Col span={12}><InfoItem label="Департамент:" value={rec?.departments} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Статус:" value={rec?.status} /></Col>
                <Col span={12}><InfoItem label="Дней в статусе:" value={rec?.days_in_status} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Дата списания АП:" value={fmtDate(rec?.write_offs_date)} /></Col>
                <Col span={12}><InfoItem label="Дата с которой Статус:" value={fmtDate(rec?.status_from)} /></Col>
              </Row>
              <Row gutter={12}>
                <Col span={12}><InfoItem label="Кто обслужил:" value={rec?.called_by} /></Col>
                <Col span={12}><InfoItem label="Дата обслуживания:" value={fmtDate(rec?.called_at)} /></Col>
              </Row>
            </Card>
          </Col>

          <Col span={14}>
            <Card title="Форма обработки клиента" styles={{ header: { fontWeight: 700 } }}>
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  status_call: rec?.status_call,
                  call_result: rec?.call_result,
                  abonent_answer: rec?.abonent_answer,
                  note: rec?.note || '',
                }}
                onFinish={onSave}
                disabled={mode === 'view'}
              >
                <Row gutter={12}>
                  <Col span={8}>
                    <Form.Item
                      name="status_call"
                      label={<span style={{ color: wStatusCall ? GREEN : RED, fontWeight: 600 }}>Статус звонка</span>}
                      rules={[{ required: true, message: 'Укажите статус звонка' }]}
                    >
                      <Select
                        showSearch
                        options={scOptions.map((v) => ({ value: v, label: v }))}
                        placeholder="Выберите..."
                        filterOption={(input, opt) =>
                          (opt?.label as string).toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      name="call_result"
                      label={<span style={{ color: wCallResult ? GREEN : RED, fontWeight: 600 }}>Результат обзвона</span>}
                      rules={[{ required: true, message: 'Укажите результат обзвона' }]}
                    >
                      <Select
                        showSearch
                        options={crOptions.map((v) => ({ value: v, label: v }))}
                        placeholder="Выберите..."
                        filterOption={(input, opt) =>
                          (opt?.label as string).toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      name="abonent_answer"
                      label={<span style={{ color: wAnswer ? GREEN : RED, fontWeight: 600 }}>Ответ абонента</span>}
                      rules={[{ required: true, message: 'Укажите ответ абонента' }]}
                    >
                      <Select
                        showSearch
                        options={aaOptions.map((v) => ({ value: v, label: v }))}
                        placeholder="Выберите..."
                        filterOption={(input, opt) =>
                          (opt?.label as string).toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="note"
                  label={<span style={{ fontWeight: 600 }}>Примечания</span>}
                  rules={[{ max: 1000, message: 'Не более 1000 символов' }]}
                >
                  <TextArea placeholder="Введите дополнительные примечания…" rows={6} showCount maxLength={1000} />
                </Form.Item>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    htmlType="submit"
                    loading={saving}
                    disabled={mode === 'view'}
                  >
                    Сохранить
                  </Button>
                </div>
              </Form>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ClientCardPage;
