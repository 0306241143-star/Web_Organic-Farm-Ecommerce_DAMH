import React, { useState, useMemo } from "react";
import {
  FolderTree,
  Search,
  Pencil,
  Trash2,
  EyeOff,
  X,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        const match =
          (c.name || "").toLowerCase().includes(kw) ||
          (c.description || "").toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });
  }, [categories, statusFilter, search]);

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {[
            { id: "ALL", label: "Tất cả", count: categories.length },
            {
              id: "Hoat_dong",
              label: "Hoạt động",
              count: categories.filter((c) => c.status === "Hoat_dong").length,
            },
            {
              id: "Tam_an",
              label: "Tạm ẩn",
              count: categories.filter((c) => c.status === "Tam_an").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  statusFilter === tab.id ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên danh mục, mô tả..."
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Table */}
      {loading ? (
        <div className="p-14 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Đang tải danh sách danh mục...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="p-14 text-center">
          <FolderTree className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <h3 className="text-sm font-bold text-slate-700">Không tìm thấy danh mục nào</h3>
          <p className="text-xs text-slate-500 mt-1">
            Bấm "Thêm Danh Mục Mới" để khởi tạo nhóm nông sản mới.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/70">
                <th className="py-3.5 px-5">Mã & Tên Danh Mục</th>
                <th className="py-3.5 px-4">Mô Tả</th>
                <th className="py-3.5 px-4">Số Sản Phẩm</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredCategories.map((cat) => {
                const isActive = cat.status === "Hoat_dong";
                const isToggling = togglingCatId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-5">
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

                    <td className="py-4 px-4 text-xs text-slate-600 max-w-md leading-relaxed">
                      {cat.description || <span className="italic text-slate-400">Chưa có mô tả</span>}
                    </td>

                    <td className="py-4 px-4 whitespace-nowrap tabular-nums">
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

                    <td className="py-4 px-4 whitespace-nowrap">
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

                    <td className="py-4 px-5 text-right whitespace-nowrap">
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