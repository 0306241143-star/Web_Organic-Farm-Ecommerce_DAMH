/* Shared empty-state message for lists without data. */
export default function EmptyState({ message = "Chưa có dữ liệu." }) {
  return <p>{message}</p>;
}
