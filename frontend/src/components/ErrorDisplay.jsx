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

export function FieldError({ error }) {
  if (!error) return null;
  return (
    <div style={{ color: '#DC2626', fontSize: 13, marginTop: 4 }}>
      {error}
    </div>
  );
}