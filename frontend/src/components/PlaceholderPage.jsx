import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authApi from '../api/authApi';

export function QuickTestNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState('');

  const handleTestPing = async () => {
    try {
      const res = await authApi.ping();
      setApiStatus(`API OK: ${res.message}`);
    } catch (err) {
      setApiStatus(`Lỗi API: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/dang-nhap');
  };

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid #ddd', background: '#f8fafc', fontSize: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <strong>[Kiểm tra điều hướng CV03.3]:</strong>
        <Link to="/">Trang chủ</Link> |
        <Link to="/san-pham">Sản phẩm</Link> |
        <Link to="/truy-xuat-qr/LO001">Quét QR</Link> |
        <Link to="/gio-hang">Giỏ hàng (Customer)</Link> |
        <Link to="/farm">Khu vực Farm_Staff</Link> |
        <Link to="/sales">Khu vực Sales</Link> |
        <Link to="/admin">Khu vực Admin</Link> |
        <button type="button" onClick={handleTestPing}>Test GET /api/ping</button>
        {user ? (
          <>
            <span>| Đang đăng nhập: <b>{user.ho_ten}</b> ({user.role})</span>
            <button type="button" onClick={handleLogout}>Đăng xuất</button>
          </>
        ) : (
          <Link to="/dang-nhap">| Đăng nhập</Link>
        )}
      </div>
      {apiStatus && <div style={{ color: '#0f766e' }}>{apiStatus}</div>}
    </div>
  );
}

// Trang trống chỉ hiển thị 1 dòng chữ kiểm tra kết nối đúng yêu cầu
export default function PlaceholderPage({ title, cvCode }) {
  const location = useLocation();

  return (
    <div style={{ padding: 24 }}>
      <p>
        Trang <strong>{title}</strong> ({cvCode}) — Route: <code>{location.pathname}</code> — Kết nối điều hướng hoạt động bình thường.
      </p>
    </div>
  );
}