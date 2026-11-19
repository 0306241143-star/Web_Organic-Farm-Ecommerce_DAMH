/* Monthly vegetable subscription registration page. */
import { Link, useLocation } from "react-router-dom";

export default function SubscriptionRegisterPage() {
  const { state } = useLocation();
  const product = state?.product;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-extrabold text-[#00450d]">
        Đăng ký gói định kỳ
      </h1>
      {product && (
        <section className="mt-5 rounded-2xl border border-[#c0c9bb]/40 bg-white p-5">
          <p className="text-sm text-[#5a6357]">Sản phẩm được chọn</p>
          <p className="mt-1 text-lg font-bold text-[#191c1b]">{product.name}</p>
          <p className="mt-1 text-sm text-[#41493e]">
            {Number(product.price).toLocaleString("vi-VN")}đ / {product.unit}
          </p>
          <Link
            to={`/products/${product.id}`}
            className="mt-3 inline-flex text-sm font-bold text-[#006e1c] hover:text-[#00450d]"
          >
            Quay lại chi tiết sản phẩm
          </Link>
        </section>
      )}
    </div>
  );
}
