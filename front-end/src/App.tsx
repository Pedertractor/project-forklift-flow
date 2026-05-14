import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { PrivateRoute } from '@/components/layout/PrivateRoute';
import { RequireRoles } from '@/components/layout/RequireRoles';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLoader } from '@/components/layout/PageLoader';
import { MACHINE_DOMAIN_ROLES, ADMIN_OR_LEADER_ROLES } from '@/types/role.types';

const HomePage = lazy(() =>
  import('@/pages/HomePage/index').then((m) => ({ default: m.HomePage })),
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage/index').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage/index').then((m) => ({ default: m.DashboardPage })),
);
const TypeMachinesPage = lazy(() =>
  import('@/pages/TypeMachinesPage/index').then((m) => ({ default: m.TypeMachinesPage })),
);
const MachinesPage = lazy(() =>
  import('@/pages/MachinesPage/index').then((m) => ({ default: m.MachinesPage })),
);
const SectorsPage = lazy(() =>
  import('@/pages/SectorsPage/index').then((m) => ({ default: m.SectorsPage })),
);
const UnauthorizedPage = lazy(() =>
  import('@/pages/UnauthorizedPage/index').then((m) => ({ default: m.UnauthorizedPage })),
);
const FirstPasswordPage = lazy(() =>
  import('@/pages/FirstPasswordPage/index').then((m) => ({ default: m.FirstPasswordPage })),
);
const UsersPage = lazy(() =>
  import('@/pages/UsersPage/index').then((m) => ({ default: m.UsersPage })),
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/definir-senha" element={<FirstPasswordPage />} />
              <Route path="/nao-autorizado" element={<UnauthorizedPage />} />
              <Route element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route element={<RequireRoles roles={MACHINE_DOMAIN_ROLES} />}>
                  <Route path="cadastro/tipos-maquina" element={<TypeMachinesPage />} />
                  <Route path="cadastro/maquinas" element={<MachinesPage />} />
                </Route>
                <Route element={<RequireRoles roles={['ADMIN']} />}>
                  <Route path="administracao/setores" element={<SectorsPage />} />
                </Route>
                <Route element={<RequireRoles roles={ADMIN_OR_LEADER_ROLES} />}>
                  <Route path="administracao/usuarios" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}