import React from "react";
import {
  FolderTree,
  Pencil,
  Trash2,
  EyeOff,
  Loader2,
  CheckCircle2,
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
    <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-xs border border-slate-200/80 flex flex-col overflow-hidden">
      {loading ? (
        <div className="flex-1 p-14 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách danh mục...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="flex-1 p-14 text-center flex flex-col items-center justify-center">
          <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <h3 className="text-sm font-bold text-slate-700">Không tìm thấy danh mục nào</h3>
          <p className="text-xs text-slate-500 mt-1">
            Bấm &ldquo;Thêm Danh Mục Mới&rdquo; để khởi tạo nhóm nông sản mới.
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-2xs">
              <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
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
                          <div className="text-[11px] font-mono text-slate-400">Mã DM #{cat.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md leading-relaxed">
                      {cat.description || <span className="italic text-slate-400">Chưa có mô tả</span>}
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
      )}
    </div>
  );
}