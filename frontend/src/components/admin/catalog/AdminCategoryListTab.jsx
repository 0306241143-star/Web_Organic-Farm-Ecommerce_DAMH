import React from "react";
import {
  FolderTree,
  Pencil,
  Trash2,
  EyeOff,
  Loader2,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

export default function AdminCategoryListTab({
  categories = [],
  loading = false,
  togglingCatId = null,
  onSelectCategoryProducts,
  onEditCategory,
  onToggleStatus,
  onDeleteCategory,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {!loading && categories.length > 0 && (
        <div className="px-3.5 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11px] sm:text-[11.5px] leading-snug text-emerald-800 flex items-center justify-between gap-2">
          <span>
            Chạm vào số lượng sản phẩm để lọc nhanh các mặt hàng thuộc danh mục.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {categories.length} danh mục
          </span>
        </div>
      )}

      {loading ? (
        <div className="px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách danh mục...
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className="px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <FolderTree className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            Không tìm thấy danh mục nào
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Bấm &ldquo;Thêm Danh Mục Mới&rdquo; để khởi tạo nhóm nông sản mới.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {categories.map((cat) => {
              const isActive = cat.status === "Hoat_dong";
              const isToggling = togglingCatId === cat.id;

              return (
                <article key={cat.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                        <FolderTree className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {cat.name}
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400">
                          Mã DM #{cat.id}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => onToggleStatus(cat)}
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isActive ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      )}
                      <span>{isActive ? "Hoạt động" : "Tạm ẩn"}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {cat.description || (
                      <span className="italic text-slate-400">Chưa có mô tả</span>
                    )}
                  </p>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onSelectCategoryProducts(String(cat.id))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold transition-colors cursor-pointer tabular-nums"
                    >
                      <span>
                        {cat.active_products_count}/{cat.total_products_count} đang bán
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditCategory(cat)}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Chỉnh sửa danh mục"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCategory(cat)}
                        className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90">
                  <th className="py-3 px-5">Mã & Tên Danh Mục</th>
                  <th className="py-3 px-4">Mô Tả</th>
                  <th className="py-3 px-4">Số Sản Phẩm</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {categories.map((cat) => {
                  const isActive = cat.status === "Hoat_dong";
                  const isToggling = togglingCatId === cat.id;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
                            <FolderTree className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{cat.name}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              Mã DM #{cat.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md leading-relaxed">
                        {cat.description || (
                          <span className="italic text-slate-400">Chưa có mô tả</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                        <button
                          type="button"
                          onClick={() => onSelectCategoryProducts(String(cat.id))}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
                          title="Bấm để xem các sản phẩm thuộc danh mục này"
                        >
                          <span>
                            {cat.active_products_count}/{cat.total_products_count} đang bán
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleStatus(cat)}
                          title="Bấm để chuyển đổi trạng thái Hoạt động / Tạm ẩn"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isActive ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{isActive ? "Hoạt động" : "Tạm ẩn"}</span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditCategory(cat)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa danh mục"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCategory(cat)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa danh mục"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}