export function FieldError({ error }) {
  if (!error) return null;
  return (
    <div style={{ color: '#DC2626', fontSize: 13, marginTop: 4 }}>
      {error}
    </div>
  );
}