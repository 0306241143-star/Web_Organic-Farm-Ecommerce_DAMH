/* Storefront navigation that can reflect the current customer session. */
import { Link } from "react-router-dom";

export default function StorefrontHeader() {
  return (
    <nav aria-label="Điều hướng cửa hàng">
      <Link to="/">Trang chủ</Link>
      <Link to="/products">Nông sản</Link>
      <Link to="/cart">Giỏ hàng</Link>
    </nav>
  );
}
