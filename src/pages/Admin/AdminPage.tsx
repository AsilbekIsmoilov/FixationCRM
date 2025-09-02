import React from 'react';
import { Card, Upload, Button, message, Typography, Space, Statistic, Row, Col } from 'antd';
import { InboxOutlined, FileExcelOutlined, UserOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { useRecordsStore } from '../../store/recordsStore';

const { Dragger } = Upload;
const { Title } = Typography;

const AdminPage: React.FC = () => {
  const { records, serviced, setRecords } = useRecordsStore();

  const beforeUpload = async (file: File) => {
    try {
      console.log('Загружаем файл:', file.name, 'размер:', file.size, 'тип:', file.type);
      
      // Проверяем тип файла
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/octet-stream' // для файлов без правильного MIME типа
      ];
      
      const fileExtension = file.name.toLowerCase().split('.').pop();
      if (!['xlsx', 'xls'].includes(fileExtension || '')) {
        message.error(`Неподдерживаемый формат файла: ${fileExtension}. Используйте .xlsx или .xls`);
        return false;
      }
      
      console.log('Чтение файла как ArrayBuffer...');
      const buf = await file.arrayBuffer();
      console.log('ArrayBuffer получен, размер:', buf.byteLength);
      
      console.log('Парсинг Excel файла...');
      const wb = XLSX.read(buf, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      console.log('Рабочая книга загружена, листов:', wb.SheetNames.length);
      console.log('Названия листов:', wb.SheetNames);
      
      if (wb.SheetNames.length === 0) {
        message.error('Excel файл не содержит ни одного листа');
        return false;
      }
      
      const sheet = wb.Sheets[wb.SheetNames[0]];
      console.log('Используем лист:', wb.SheetNames[0]);
      
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      console.log('Данные из Excel:', json.length, 'записей');
      console.log('Первая запись:', json[0]);
      
      if (json.length === 0) {
        message.error('Excel файл не содержит данных или данные не могут быть прочитаны');
        return false;
      }
      
      // Добавляем ID к каждой записи
      const recordsWithIds = json.map((record, index) => ({
        ...record,
        id: record.id || `record_${index + 1}`
      }));
      
      console.log('Записи с ID:', recordsWithIds.length);
      
      // Сохраняем данные через store
      setRecords(recordsWithIds);
      
      // Принудительно сохраняем в localStorage как резервную копию
      try {
        const backupData = JSON.stringify(recordsWithIds);
        const sizeInMB = (backupData.length * 2) / (1024 * 1024); // UTF-16
        
        console.log(`Размер данных: ${sizeInMB.toFixed(2)} MB`);
        
        if (sizeInMB > 4) { // Лимит 4MB для безопасности
          console.warn('Файл большой, backup будет ограничен');
          const sampleData = recordsWithIds.slice(0, 1000);
          localStorage.setItem('excel-backup', JSON.stringify(sampleData));
          localStorage.setItem('excel-backup-info', JSON.stringify({
            totalRecords: recordsWithIds.length,
            sampleSize: sampleData.length,
            dataTooLarge: true,
            originalSize: sizeInMB
          }));
          message.warning(`Файл большой (${sizeInMB.toFixed(1)}MB). В резерве сохранено только ${sampleData.length} записей.`);
        } else {
          localStorage.setItem('excel-backup', backupData);
          localStorage.setItem('excel-backup-info', JSON.stringify({
            totalRecords: recordsWithIds.length,
            fullBackup: true
          }));
          console.log('Backup сохранен полностью');
        }
      } catch (backupError) {
        console.warn('Не удалось создать backup:', backupError);
        message.warning('Backup не создан из-за размера файла, но основные данные загружены');
      }
      
      // Проверяем, что данные действительно сохранились
      setTimeout(() => {
        const currentRecords = useRecordsStore.getState().records;
        console.log('Проверка: в store сейчас', currentRecords.length, 'записей');
        if (currentRecords.length !== recordsWithIds.length) {
          console.error('ОШИБКА: Данные не сохранились в store!');
          message.error('Ошибка сохранения данных в хранилище');
        }
      }, 100);
      
      message.success(`Загружено записей: ${json.length}`);
    } catch (error) {
      console.error('Подробная ошибка при загрузке Excel файла:');
      console.error('- Сообщение:', error instanceof Error ? error.message : String(error));
      console.error('- Стек:', error instanceof Error ? error.stack : 'Нет стека');
      console.error('- Объект ошибки:', error);
      
      let errorMessage = 'Ошибка при загрузке файла';
      if (error instanceof Error) {
        if (error.message.includes('Unsupported file')) {
          errorMessage = 'Неподдерживаемый формат файла. Используйте .xlsx или .xls';
        } else if (error.message.includes('Invalid header')) {
          errorMessage = 'Поврежденный или некорректный Excel файл';
        } else if (error.message.includes('Cannot read')) {
          errorMessage = 'Не удается прочитать файл. Убедитесь, что файл не поврежден';
        } else {
          errorMessage = `Ошибка: ${error.message}`;
        }
      }
      
      message.error(errorMessage);
    }
    return false;
  };

  const clearData = () => {
    setRecords([]);
    // Также очищаем backup
    try {
      localStorage.removeItem('excel-backup');
      localStorage.removeItem('excel-backup-info');
      console.log('Backup очищен');
    } catch (error) {
      console.warn('Не удалось очистить backup:', error);
    }
    message.success('Все данные очищены');
  };

  return (
    <div style={{ padding: 16, fontSize: '15px' }}>
      <Title level={2} style={{ fontSize: '24px' }}>Административная панель</Title>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Всего записей"
              value={records.length}
              prefix={<FileExcelOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Обслужено"
              value={serviced.length}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Осталось обработать"
              value={records.length - serviced.length}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="Загрузка данных" size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Dragger
                beforeUpload={beforeUpload}
                showUploadList={false}
                style={{ padding: 20 }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} />
                </p>
                <p className="ant-upload-text">
                  Нажмите или перетащите Excel файл в эту область
                </p>
                <p className="ant-upload-hint">
                  Поддерживаются форматы .xlsx, .xls
                </p>
              </Dragger>
              
              {records.length > 0 && (
                <Button danger onClick={clearData}>
                  Очистить все данные
                </Button>
              )}
            </Space>
          </Card>
        </Col>
        
        <Col span={12}>
          <Card title="Информация" size="small">
            <Space direction="vertical">
              <div>
                <strong>Как использовать:</strong>
                <ul style={{ marginTop: 8 }}>
                  <li>Загрузите Excel файл с клиентскими данными</li>
                  <li>Данные автоматически сохранятся в локальное хранилище</li>
                  <li>Операторы смогут работать с данными в рабочей области</li>
                  <li>Прогресс обработки отображается в статистике</li>
                </ul>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminPage;
