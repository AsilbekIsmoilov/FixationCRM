export interface RawRecord {
  id: string | number;
  FULL_NAME?: string;
  MSISDN?: string;
  ACCOUNT?: string;
  CLIENT?: string;
  BRANCH?: string;
  DEPARTMENT?: string;
  TECHNOLOGY?: string;
  STATUS?: string;
  RATE_PLAN?: string;
  BALANCE?: number | string;
  MONTHLY_FEE?: number | string;
  STATUS_DATE?: string;
  DAYS_IN_STATUS?: number;
  AP_WRITE_OFF_DATE?: string;
  PHONE?: string;
  [key: string]: any;
}

export interface CallMeta {
  callStatus: 'Дозвонился' | 'Не дозвонился' | 'Не звонили';
  callResult:
    | 'Ответили на вопрос' | 'Отказ от разговора' | 'Другой владелец номера'
    | 'Нет ответа' | 'Аппарат выключен' | 'Номер не существует'
    | 'Дубликат номера' | 'Статус Активный';
  subscriberAnswer:
    | 'Временно нет потребности в интернете' | 'Финансовые трудности'
    | 'Забыли внести платеж' | 'Высокая стоимость ТП'
    | 'Не устраивает качество сети' | 'Плохое обслуживание'
    | 'Переезд' | 'Смена технологии' | 'Смена провайдера'
    | 'Абонент активный' | 'Оплатит в скором времени';
  note?: string;
}

export interface ServicedRecord extends RawRecord {
  callMeta: CallMeta;
  servicedAt: string; // ISO
}
