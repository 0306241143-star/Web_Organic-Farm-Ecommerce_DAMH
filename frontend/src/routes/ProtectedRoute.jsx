/* Redirects unauthenticated users to the login page. */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p role="status">Đang kiểm tra phiên đăng nhập...</p>;
  }

  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
