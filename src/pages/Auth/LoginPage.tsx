// src/pages/Auth/LoginPage.tsx
import React from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { API_BASE } from '../../store/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { login } = useAuthStore();
  const from = location.state?.from?.pathname || '/workspace';

  const onFinish = async (values: any) => {
    try {
      const ok = await login(values.login, values.password);
      if (ok) {
        message.success('Успешный вход!');
        navigate(from, { replace: true });
      } else {
        message.error('Неверный логин или пароль');
      }
    } catch {
      message.error('Ошибка при входе');
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Card title="Вход" style={{ width: 400 }} headStyle={{ fontSize: 18 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="login" label="Логин" rules={[{ required: true, message: 'Введите логин' }]}>
            <Input placeholder="username" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password placeholder="password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Войти
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginPage;
