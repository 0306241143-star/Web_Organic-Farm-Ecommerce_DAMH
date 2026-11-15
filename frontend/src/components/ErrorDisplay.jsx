import { useEffect, useState } from 'react';

// 1. Toast hiển thị lỗi API toàn cục (401, 403, 500, mất mạng)
export function GlobalToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setToast(e.detail);
      setTimeout(() => setToast(null), 4000);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  if (!toast) return null;

  const isError = toast.type === 'error';
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        padding: '12px 16px',
        borderRadius: 6,
        backgroundColor: isError ? '#FEE2E2' : '#DCFCE7',
        color: isError ? '#991B1B' : '#166534',
        border: `1px solid ${isError ? '#F87171' : '#4ADE80'}`,
        fontWeight: 500,
      }}
    >
      {toast.message}
    </div>
  );
}

// 2. Banner hiển thị lỗi chung đầu Form
export function FormErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        padding: '10px 12px',
        marginBottom: 12,
        borderRadius: 4,
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        color: '#B91C1C',
        fontSize: 14,
      }}
    >
      {message}
    </div>
  );
}

// 3. Dòng chữ báo lỗi Validation 422 dưới từng ô nhập liệu
export function FieldError({ error }) {
  if (!error) return null;
  return (
    <div style={{ color: '#DC2626', fontSize: 13, marginTop: 4 }}>
      {error}
    </div>
  );
}