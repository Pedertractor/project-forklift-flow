import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthMe } from '@/hooks/useAuthMe';
import { resolvePostLoginPath } from '@/lib/route-access';
import { useAuthStore } from '@/store/auth.store';

const FIRST_PASSWORD_PATH = '/definir-senha';

type PrivateLocationState = { from?: { pathname?: string } } | null | undefined;

export function PrivateRoute() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const location = useLocation();
  useAuthMe();

  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // if (Boolean(token) && !user && (meQuery.isPending || meQuery.isFetching)) {
  //   return <PageLoader />;
  // }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresPasswordChange && location.pathname !== FIRST_PASSWORD_PATH) {
    return (
      <Navigate to={FIRST_PASSWORD_PATH} replace state={{ from: location }} />
    );
  }

  if (!requiresPasswordChange && location.pathname === FIRST_PASSWORD_PATH) {
    const state = location.state as PrivateLocationState;
    return (
      <Navigate
        to={resolvePostLoginPath(state?.from?.pathname, user.role)}
        replace
      />
    );
  }

  return <Outlet />;
}
