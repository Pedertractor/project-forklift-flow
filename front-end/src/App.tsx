import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { PrivateRoute } from '@/components/layout/PrivateRoute';
import { RequireRoles } from '@/components/layout/RequireRoles';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLoader } from '@/components/layout/PageLoader';
import { RequireBoundMovimentPallet } from '@/components/layout/RequireBoundMovimentPallet';
import {
  ADMIN_OR_LEADER_ROLES,
  MACHINE_DOMAIN_ROLES,
  MOVIMENT_OPERATOR_ROLES,
  OPERATOR_MACHINE_ROLES,
} from '@/types/role.types';

const HomePage = lazy(() =>
  import('@/pages/HomePage/index').then((m) => ({ default: m.HomePage })),
);
const LoginPage = lazy(() =>
  import('@/pages/LoginPage/index').then((m) => ({ default: m.LoginPage })),
);
const DashboardAreaLayout = lazy(() =>
  import('@/pages/DashboardPage/index').then((m) => ({
    default: m.DashboardAreaLayout,
  })),
);
const DashboardHubPage = lazy(() =>
  import('@/pages/DashboardPage/index').then((m) => ({
    default: m.DashboardHubPage,
  })),
);
const DashboardGeralPage = lazy(() =>
  import('@/pages/DashboardPage/index').then((m) => ({
    default: m.DashboardGeralPage,
  })),
);
const DashboardPorEmpilhadeiristaPage = lazy(() =>
  import('@/pages/DashboardPage/index').then((m) => ({
    default: m.DashboardPorEmpilhadeiristaPage,
  })),
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

const ReplenishmentRequestsPage = lazy(() =>
  import('@/pages/ReplenishmentRequestsPage/index').then((m) => ({
    default: m.ReplenishmentRequestsPage,
  })),
);
const SupplyPendingPreparationPage = lazy(() =>
  import('@/pages/SupplyPendingPreparationPage/index').then((m) => ({
    default: m.SupplyPendingPreparationPage,
  })),
);
const OperatorMachinePickupProgressPage = lazy(() =>
  import('@/pages/OperatorMachinePickupProgressPage/index').then((m) => ({
    default: m.OperatorMachinePickupProgressPage,
  })),
);
const OperatorMachinePage = lazy(() =>
  import('@/pages/OperatorMachinePage/index').then((m) => ({
    default: m.OperatorMachinePage,
  })),
);
const OperatorMovimentEquipmentPage = lazy(() =>
  import('@/pages/OperatorMovimentEquipmentPage/index').then((m) => ({
    default: m.OperatorMovimentEquipmentPage,
  })),
);
const OperatorMovimentQueuePage = lazy(() =>
  import('@/pages/OperatorMovimentQueuePage/index').then((m) => ({
    default: m.OperatorMovimentQueuePage,
  })),
);
const OperatorMovimentTasksPage = lazy(() =>
  import('@/pages/OperatorMovimentTasksPage/index').then((m) => ({
    default: m.OperatorMovimentTasksPage,
  })),
);
const OperatorMovimentManualQueuePage = lazy(() =>
  import('@/pages/OperatorMovimentManualQueuePage/index').then((m) => ({
    default: m.OperatorMovimentManualQueuePage,
  })),
);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<PrivateRoute />}>
              <Route path="/definir-senha" element={<FirstPasswordPage />} />
              <Route path="/nao-autorizado" element={<UnauthorizedPage />} />
              <Route element={<MainLayout />}>
                <Route element={<RequireRoles roles={ADMIN_OR_LEADER_ROLES} />}>
                  <Route index element={<HomePage />} />
                  <Route path="dashboard" element={<DashboardAreaLayout />}>
                    <Route index element={<DashboardHubPage />} />
                    <Route path="geral" element={<DashboardGeralPage />} />
                    <Route
                      path="por-empilhadeirista"
                      element={<DashboardPorEmpilhadeiristaPage />}
                    />
                  </Route>
                </Route>
                <Route element={<RequireRoles roles={ADMIN_OR_LEADER_ROLES} />}>
                  <Route path="cadastro/tipos-maquina" element={<TypeMachinesPage />} />
                  <Route path="cadastro/maquinas" element={<MachinesPage />} />
                </Route>
                <Route element={<RequireRoles roles={MACHINE_DOMAIN_ROLES} />}>
                  <Route
                    path="abastecimento/solicitacoes"
                    element={<ReplenishmentRequestsPage />}
                  />
                  <Route
                    path="abastecimento/preparo-pendente"
                    element={<SupplyPendingPreparationPage />}
                  />
                </Route>
                <Route element={<RequireRoles roles={['ADMIN']} />}>
                  <Route path="administracao/setores" element={<SectorsPage />} />
                </Route>
                <Route element={<RequireRoles roles={ADMIN_OR_LEADER_ROLES} />}>
                  <Route path="administracao/usuarios" element={<UsersPage />} />
                </Route>
                <Route element={<RequireRoles roles={MOVIMENT_OPERATOR_ROLES} />}>
                  <Route path="operacao/equipamento" element={<OperatorMovimentEquipmentPage />} />
                  <Route path="operacao/aceitar-tarefas" element={<OperatorMovimentQueuePage />} />
                  <Route element={<RequireBoundMovimentPallet />}>
                    <Route path="operacao/tarefas" element={<OperatorMovimentQueuePage />} />
                    <Route
                      path="operacao/filas-manuais"
                      element={<OperatorMovimentManualQueuePage />}
                    />
                    <Route path="operacao/minhas-tarefas" element={<OperatorMovimentTasksPage />} />
                  </Route>
                </Route>
                <Route element={<RequireRoles roles={OPERATOR_MACHINE_ROLES} />}>
                  <Route
                    path="dobra"
                    element={<Navigate to="/dobra/operacao" replace />}
                  />
                  <Route path="dobra/operacao" element={<OperatorMachinePage />} />
                  <Route
                    path="dobra/retirada/:requestId"
                    element={<OperatorMachinePickupProgressPage />}
                  />
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