/* Product card showing price, certification, and availability. */
export default function ProductCard({ product }) {
  return (
    <article>
      <h2>{product?.name ?? "Tên nông sản"}</h2>
      <p>{product?.price ?? "Giá đang cập nhật"}</p>
    </article>
  );
}
