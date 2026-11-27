/* Chặn người chưa đăng nhập và tài khoản bị khóa khỏi route cần xác thực. */
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const token = localStorage.getItem("access_token");

  // Đang xác thực token và đồng bộ phiên làm việc từ máy chủ
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500">Đang xác thực phiên làm việc...</span>
        </div>
      </div>
    );
  }

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
