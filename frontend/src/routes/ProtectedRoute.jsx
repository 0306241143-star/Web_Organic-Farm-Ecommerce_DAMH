import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 20 }}>Đang kiểm tra phiên đăng nhập...</div>;
  }

  // Chưa đăng nhập -> chuyển về trang đăng nhập và lưu lại đường dẫn cũ
  if (!user) {
    return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  }

  // Sai vai trò -> chặn truy cập (cô lập quyền giữa Farm_Staff, Sales, Admin, Customer)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}