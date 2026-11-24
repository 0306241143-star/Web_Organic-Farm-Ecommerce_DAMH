/* Nông sản nổi bật hôm nay: hiển thị đúng 3 sản phẩm bán chạy nhất và đang còn hàng. */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import ProductCard from "../public/ProductCard";

export default function FeaturedProductsSection({ products = [], loading = false }) {
  const topInStockProducts = useMemo(() => {
    return (Array.isArray(products) ? products : [])
      .filter((item) => {
        const stock = Number(item?.available_stock ?? 0);
        const isInStock = item?.in_stock === true || stock > 0;
        const isActive = item?.status !== "Tam_ngung";
        return isInStock && isActive;
      })
      .sort((a, b) => Number(b?.sold_count ?? 0) - Number(a?.sold_count ?? 0))
      .slice(0, 3);
  }, [products]);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 sm:mb-6">
        <div>
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-700">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vụ mùa hái sáng nay</span>
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            Nông Sản Nổi Bật Hôm Nay
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Top 3 nông sản bán chạy nhất đang sẵn hàng tại vườn, gắn mã QR truy xuất từng lô.
          </p>
        </div>

        <Link
          to="/products"
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <span>Xem Tất Cả Nông Sản</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 rounded-3xl bg-white border border-slate-200/80 animate-pulse"
            />
          ))}
        </div>
      ) : topInStockProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs sm:text-sm text-slate-500">
          Hiện chưa có nông sản nào còn tồn kho để hiển thị.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {topInStockProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <div className="mt-6 sm:mt-8 text-center">
        <Link
          to="/products"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-xs sm:text-sm font-extrabold text-[#00450d] shadow-2xs transition-colors"
        >
          <span>Khám Phá Toàn Bộ Nông Sản Hữu Cơ</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}