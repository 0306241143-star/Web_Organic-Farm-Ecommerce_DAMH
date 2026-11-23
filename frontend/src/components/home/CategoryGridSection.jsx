/* Danh mục nông sản: cuộn ngang mượt mà trên Mobile để tiết kiệm chiều cao và hiển thị lưới chuẩn trên Desktop. */
import { Link } from "react-router-dom";
import { ArrowUpRight, Carrot, Citrus, Leaf, Sprout } from "lucide-react";

const CATEGORY_ICONS = [Leaf, Carrot, Citrus, Sprout];

export default function CategoryGridSection({ categories = [], loading = false }) {
  if (!loading && categories.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-5 sm:mb-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#006e1c] block">
            Khám phá mùa vụ
          </span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5">
            Danh Mục Nông Sản Hữu Cơ XanhFarm
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chọn nhanh nhóm nông sản tươi sạch thu hoạch trong ngày theo tiêu chuẩn VietGAP & Hữu cơ.
          </p>
        </div>

        <Link
          to="/products"
          className="self-start sm:self-auto text-xs font-extrabold text-[#00450d] hover:text-[#006e1c] inline-flex items-center gap-1"
        >
          <span>Xem tất cả danh mục</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white border border-slate-200/80 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 snap-x snap-mandatory scrollbar-none">
          {categories.map((cat, idx) => {
            const Icon = CATEGORY_ICONS[idx % CATEGORY_ICONS.length];
            const count = Number(cat.products_count ?? cat.total_products_count ?? 0);

            return (
              <Link
                key={cat.id}
                to={`/products?category_id=${cat.id}`}
                className="group min-w-[210px] sm:min-w-0 snap-start rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/85 hover:border-[#006e1c] hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/70 text-[#006e1c] flex items-center justify-center group-hover:bg-[#00450d] group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 tabular-nums">
                    {count} sản phẩm
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#00450d] transition-colors truncate">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {cat.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11.5px] font-bold text-[#006e1c]">
                  <span>Lọc sản phẩm theo danh mục</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}