import React from 'react';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogoutOutlined, UserOutlined, DownOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Header, Content } = Layout;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loadMe } = useAuthStore();

  React.useEffect(() => { loadMe(); }, [loadMe]);

  const roleLabel = React.useMemo(() => {
    const u: any = user;
    return (
      u?.role ||
      u?.position ||
      u?.role_name ||
      u?.role_display ||
      (Array.isArray(u?.groups) && u.groups[0]?.name) ||
      (u?.is_superuser ? 'administrator' : u?.is_staff ? 'staff' : '')
    );
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName =
    user?.name ||                             
    [user as any]?.first_name && [user as any]?.last_name
      ? `${(user as any).first_name} ${(user as any).last_name}`.trim()
      : user?.username || 'Нет имени';

  const initials = React.useMemo(() => {
    const fromUser = (user as any)?.initials as string | undefined;
    if (fromUser && fromUser.trim()) return fromUser.trim().slice(0, 2).toUpperCase();
    const base = (user?.name || user?.username || 'U').toString();
    return base
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(s => s[0])
      .join('')
      .toUpperCase();
  }, [user]);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: displayName,    
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти из системы',
      onClick: handleLogout,
      style: { color: '#ff4d4f' },
    },
  ];

  const activeKey = React.useMemo(() => {
    if (location.pathname.startsWith('/stats')) return '/stats';
    if (location.pathname.startsWith('/admin')) return '/admin';
    if (location.pathname.startsWith('/administration')) return '/administration';
    return '/workspace';
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          height: 58,
          lineHeight: '58px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minWidth: 280, gap: 12 }}>
          <img
            src="/assets/company-logo.png"
            alt="UZTELECOM"
            style={{ height: 36, width: 'auto', objectFit: 'contain' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Menu
            mode="horizontal"
            selectedKeys={[activeKey]}
            onClick={(e) => navigate(e.key as string)}
            style={{ border: 'none', background: 'transparent', fontSize: 14, lineHeight: '58px' }}
            items={[
              { key: '/workspace', label: 'Рабочая область' },
              { key: '/admin', label: 'Обслуженные клиенты' },
              { key: '/stats', label: 'Статистика', disabled: true },
              { key: '/administration', label: 'Администрирование', disabled: true },
            ]}
          />
        </div>

<div
  style={{
    minWidth: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    height: 58,
  }}
>
  <Dropdown
    menu={{
      items: [
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: user?.username || 'Профиль пользователя',
          disabled: true,
        },
        { type: 'divider' as const },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Выйти из системы',
          onClick: () => { logout(); navigate('/login'); },
          style: { color: '#ff4d4f' },
        },
      ],
    }}
    trigger={['click']}
    placement="bottomRight"
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = '#f5f5f5')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent')}
    >
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 500, fontSize: 13, lineHeight: '18px' }}>
          {user?.name || user?.username || 'Нет имени'}
        </div>
      </div>
      <Avatar
        style={{
          backgroundColor: '#1890ff',
          flexShrink: 0,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #f0f0f0',
          fontWeight: 600,
        }}
      >
        {(user?.initials || user?.name || user?.username || 'U').toString().slice(0, 2).toUpperCase()}
      </Avatar>
      <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
    </div>
  </Dropdown>
</div>
      </Header>

      <Content style={{ padding: 0, minHeight: 'calc(100vh - 58px)', overflow: 'auto' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};

export default MainLayout;
