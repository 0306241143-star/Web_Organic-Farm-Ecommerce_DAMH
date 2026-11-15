import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getDefaultRouteByRole, useAuth } from '../contexts/AuthContext';
import { FieldError, FormErrorBanner } from '../components/ErrorDisplay';

export default function LoginTestPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('admin@nongsansach.vn');
  const [password, setPassword] = useState('password');
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFieldErrors({});
    setSubmitting(true);

    try {
      const loggedUser = await login(email, password);
      const target = location.state?.from?.pathname || getDefaultRouteByRole(loggedUser.role);
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(err.message);
      setFieldErrors(err.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '32px auto', padding: 20, border: '1px solid #ddd' }}>
      <h3>Đăng nhập kiểm thử kết nối API (CV03.3)</h3>
      <FormErrorBanner message={formError} />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email:</label>
          <input
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 6, marginTop: 4 }}
          />
          <FieldError error={fieldErrors.email} />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 6, marginTop: 4 }}
          />
          <FieldError error={fieldErrors.password} />
        </div>

        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? 'Đang gửi API...' : 'Đăng nhập'}
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 13, color: '#475569' }}>
        <div>Tài khoản mẫu (mật khẩu chung: <code>password</code>):</div>
        <ul>
          <li>Admin: <code>admin@nongsansach.vn</code></li>
          <li>Sales: <code>sales.ha@nongsansach.vn</code></li>
          <li>Farm_Staff: <code>farm.nong@nongsansach.vn</code></li>
          <li>Customer: <code>ngocanh.khach@gmail.com</code></li>
        </ul>
      </div>
    </div>
  );
}