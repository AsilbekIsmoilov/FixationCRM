
import React, { useMemo } from 'react';
import { Card, Statistic, Row, Col, Divider } from 'antd';
import { useRecordsStore } from '../../store/recordsStore';
import ReactECharts from 'echarts-for-react';

const StatsPage: React.FC = () => {
  const serviced = useRecordsStore(s => s.serviced);

  // Считаем статистику по дням за месяц
  const now = new Date();
  const today = now.toDateString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const todayCount = serviced.filter(s => new Date(s.servicedAt).toDateString() === today).length;
  const weekCount = serviced.filter(s => new Date(s.servicedAt) >= weekAgo).length;
  const monthCount = serviced.filter(s => new Date(s.servicedAt) >= monthAgo).length;

  // График по дням
  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString();
      days[key] = 0;
    }
    serviced.forEach(s => {
      const d = new Date(s.servicedAt).toLocaleDateString();
      if (days[d] !== undefined) days[d]++;
    });
    return {
      labels: Object.keys(days),
      values: Object.values(days),
    };
  }, [serviced]);

  // Диаграммы по статусу, результату, ответу
  function countBy(fn: (s: any) => string) {
    const map: Record<string, number> = {};
    serviced.forEach(s => {
      const key = fn(s);
      if (!key) return;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }

  const statusData = countBy(s => s.callMeta?.callStatus);
  const resultData = countBy(s => s.callMeta?.callResult);
  const answerData = countBy(s => s.callMeta?.subscriberAnswer);

  return (
    <div style={{ padding: '16px', fontSize: '15px' }}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Обслужено сегодня" value={todayCount} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="За неделю" value={weekCount} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="За месяц" value={monthCount} />
          </Card>
        </Col>
      </Row>
      <Card title="График по дням (за месяц)" style={{ marginBottom: 24 }}>
        <ReactECharts
          style={{ height: 320 }}
          option={{
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: dailyData.labels },
            yAxis: { type: 'value' },
            series: [{
              data: dailyData.values,
              type: 'bar',
              color: '#1890ff',
              name: 'Обслужено',
              smooth: true,
            }],
            grid: { left: 40, right: 20, bottom: 40, top: 40 },
          }}
        />
      </Card>
      <Row gutter={16}>
        <Col span={8}>
          <Card title="Статус звонка">
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['40%', '70%'],
                  avoidLabelOverlap: false,
                  label: { show: false },
                  emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                  data: Object.entries(statusData).map(([name, value]) => ({ name, value })),
                }],
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Результат обзвона">
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['40%', '70%'],
                  avoidLabelOverlap: false,
                  label: { show: false },
                  emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                  data: Object.entries(resultData).map(([name, value]) => ({ name, value })),
                }],
              }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Ответ абонента">
            <ReactECharts
              style={{ height: 260 }}
              option={{
                tooltip: { trigger: 'item' },
                legend: { bottom: 0 },
                series: [{
                  type: 'pie',
                  radius: ['40%', '70%'],
                  avoidLabelOverlap: false,
                  label: { show: false },
                  emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
                  data: Object.entries(answerData).map(([name, value]) => ({ name, value })),
                }],
              }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StatsPage;
