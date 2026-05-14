import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';

const FIRST_PASSWORD_PATH = '/definir-senha';

export function PrivateRoute() {
  const user = useAuthStore((s) => s.user);
  const requiresPasswordChange = useAuthStore((s) => s.requiresPasswordChange);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiresPasswordChange && location.pathname !== FIRST_PASSWORD_PATH) {
    return <Navigate to={FIRST_PASSWORD_PATH} replace state={{ from: location }} />;
  }

  if (!requiresPasswordChange && location.pathname === FIRST_PASSWORD_PATH) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
