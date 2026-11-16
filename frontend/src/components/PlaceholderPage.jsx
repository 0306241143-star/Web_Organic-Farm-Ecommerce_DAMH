import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import authApi from '../api/authApi';
import { postMultipart } from '../services/axiosClient';

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

  const handleTestUpload = async () => {
    try {
      const pngBytes = Uint8Array.from(
        atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jPqsAAAAASUVORK5CYII='),
        (character) => character.charCodeAt(0)
      );
      const file = new File([pngBytes], 'probe.png', { type: 'image/png' });
      const res = await postMultipart('/test/upload', {
        mo_ta: 'Kiểm thử gửi FormData',
        file,
      });
      setApiStatus(`FormData OK: ${res.message}`);
    } catch (err) {
      setApiStatus(`Lỗi FormData: ${err.message}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/test-api');
  };

  return (
    <div style={{ padding: '10px 16px', borderBottom: '1px solid #ddd', background: '#f8fafc', fontSize: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 6 }}>
        <strong>[Kiểm tra điều hướng CV03.3]:</strong>
        <Link to="/">Trang chủ</Link> |
        <Link to="/products">Sản phẩm</Link> |
        <Link to="/trace/LO001">Quét QR</Link> |
        <Link to="/cart">Giỏ hàng (Customer)</Link> |
        <Link to="/farm/seasons">Khu vực Farm_Staff</Link> |
        <Link to="/sales/orders">Khu vực Sales</Link> |
        <Link to="/admin">Khu vực Admin</Link> |
        <Link to="/test-api">Kiểm thử API</Link> |
        <button type="button" onClick={handleTestPing}>Test GET /api/ping</button>
        <button type="button" onClick={handleTestUpload}>Test POST /api/test/upload</button>
        {user ? (
          <>
            <span>| Đang đăng nhập: <b>{user.ho_ten}</b> ({user.role})</span>
            <button type="button" onClick={handleLogout}>Đăng xuất</button>
          </>
        ) : (
          <Link to="/test-api">| Đăng nhập kiểm thử</Link>
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