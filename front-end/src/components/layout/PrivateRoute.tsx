import { useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { PageLoader } from '@/components/layout/PageLoader';
import { useAuthMe } from '@/hooks/useAuthMe';
import { resolvePostLoginPath } from '@/lib/route-access';
import { useAuthStore } from '@/store/auth.store';

const FIRST_PASSWORD_PATH = '/definir-senha';
const UNAUTHORIZED_PATH = '/nao-autorizado';

type PrivateLocationState = { from?: { pathname?: string } } | null | undefined;
type UnauthorizedLocationState = { from?: string } | null | undefined;

export function PrivateRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const location = useLocation();
  const navigate = useNavigate();
  const meQuery = useAuthMe();

  const firstAccess = meQuery.data?.firstAccess ?? requiresPasswordChange;
  const profileReady = !token || meQuery.isFetched;

  useEffect(() => {
    if (!meQuery.isSuccess || !meQuery.data || location.pathname !== UNAUTHORIZED_PATH) {
      return;
    }
    const state = location.state as UnauthorizedLocationState;
    const target = resolvePostLoginPath(state?.from, meQuery.data.role);
    if (target !== UNAUTHORIZED_PATH) {
      navigate(target, { replace: true });
    }
  }, [location.pathname, location.state, meQuery.data, meQuery.isSuccess, navigate]);

  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!profileReady) {
    return <PageLoader />;
  }

  if (!user && !meQuery.data) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (firstAccess && location.pathname !== FIRST_PASSWORD_PATH) {
    return (
      <Navigate to={FIRST_PASSWORD_PATH} replace state={{ from: location }} />
    );
  }

  if (!firstAccess && location.pathname === FIRST_PASSWORD_PATH) {
    const state = location.state as PrivateLocationState;
    const role = meQuery.data?.role ?? user?.role;
    return (
      <Navigate
        to={resolvePostLoginPath(state?.from?.pathname, role)}
        replace
      />
    );
  }

  return <Outlet />;
}
