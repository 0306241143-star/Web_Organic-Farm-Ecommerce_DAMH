import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div style={{ padding: 20 }}>Đang kiểm tra phiên đăng nhập...</div>;
  }

  // Chưa đăng nhập -> chuyển về trang đăng nhập và lưu lại đường dẫn cũ
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Chuẩn hóa chữ thường để khớp giữa CSDL ('Sales', 'Farm_Staff'...) và Route ('sales', 'farm_staff'...)
  const currentRole = String(user.role || '').toLowerCase();
  const normalizedAllowed = Array.isArray(allowedRoles)
    ? allowedRoles.map((r) => String(r).toLowerCase())
    : [];

  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(currentRole)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}