import { useState, useEffect } from 'react';

export default function GlobalToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer = null;

    const handleToastEvent = (e) => {
      const { type, message } = e.detail || {};
      if (timer) clearTimeout(timer);

      setToast({ type, message });

      timer = setTimeout(() => {
        setToast(null);
      }, 4000);
    };

    window.addEventListener('app:toast', handleToastEvent);
    return () => {
      window.removeEventListener('app:toast', handleToastEvent);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '8px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: toast.type === 'error' ? '#fee2e2' : '#d1fae5',
        color: toast.type === 'error' ? '#991b1b' : '#065f46',
        padding: '10px 20px',
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        fontWeight: 500,
        fontSize: '14px',
        border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#6ee7b7'}`,
      }}
    >
      {toast.message}
    </div>
  );
}