import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface ProtectedRouteProps {
  children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthorized = useAuthStore((state) => state.isAuthorized);
  const location = useLocation();

  if (!isAuthorized) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
