/* Redirects unauthenticated users or locked accounts to the login page (CV04.6). */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("access_token");

  // Nếu không có token và không có user, chuyển hướng đăng nhập
  if (!token && !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Chặn tài khoản bị khóa
  if (user && user.status === "Khoa") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
