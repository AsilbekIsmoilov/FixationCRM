import React, { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';

import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/Auth/LoginPage';
import WorkspacePage from './pages/Workspace/WorkspacePage';
import ClientCardPage from './pages/Workspace/ClientCardPage';
import ServicedTable from './components/workspace/ServicedTable';
import { useAuthStore } from './store/authStore';

const CenterSpinner = (
  <div style={{ display:'flex', height:'100vh', alignItems:'center', justifyContent:'center' }}>
    <Spin size="large" />
  </div>
);

function Protected({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuthStore();
  const location = useLocation();

  if (initializing) return CenterSpinner;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return <>{children}</>;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="Произошла ошибка в интерфейсе"
          subTitle={String(this.state.error?.message || this.state.error)}
          extra={<Button onClick={() => window.location.reload()}>Перезагрузить</Button>}
        />
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const loadMe = useAuthStore(s => s.loadMe);
  React.useEffect(() => { loadMe(); }, [loadMe]);

  return (
    <AppErrorBoundary>
      <Suspense fallback={CenterSpinner}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <Protected>
                <MainLayout />
              </Protected>
            }
          >
            <Route path="workspace" element={<WorkspacePage />} />
            <Route path="workspace/client/:id" element={<ClientCardPage />} />
            <Route path="admin" element={<ServicedTable />} />
            <Route path="administration" element={<div style={{ padding: 24 }}>Администрирование (заглушка)</div>} />
            <Route path="stats" element={<div style={{ padding: 24 }}>Статистика (заглушка)</div>} />
          </Route>

          <Route path="*" element={<Result status="404" title="404" subTitle="Страница не найдена" />} />
        </Routes>
      </Suspense>
    </AppErrorBoundary>
  );
}
