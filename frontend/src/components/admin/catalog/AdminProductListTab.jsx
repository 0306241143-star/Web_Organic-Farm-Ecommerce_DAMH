import React from "react";
import {
  PackageSearch,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Award,
  Sparkles,
} from "lucide-react";

const DEFAULT_PROD_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88" fill="none">
      <rect width="88" height="88" rx="16" fill="#ECFDF5"/>
      <path d="M44 26C35 26 29 33 29 42C29 51 36 58 44 58C52 58 59 51 59 42C59 33 53 26 44 26ZM44 52C38.5 52 34 47.5 34 42C34 36.5 38.5 32 44 32C49.5 32 54 36.5 54 42C54 47.5 49.5 52 44 52Z" fill="#10B981" fill-opacity="0.35"/>
      <circle cx="44" cy="42" r="6" fill="#059669"/>
    </svg>`
  );

export default function AdminProductListTab({
  products = [],
  loading = false,
  togglingProdId = null,
  onEditProduct,
  onToggleStatus,
  onDeleteProduct,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Sub-header tóm tắt */}
      {!loading && products.length > 0 && (
        <div className="px-3.5 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11px] sm:text-[11.5px] leading-snug text-emerald-800 flex items-center justify-between gap-2">
          <span>
            Chạm vào badge trạng thái để bật/tắt mở bán nhanh từng mặt hàng.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {products.length} sản phẩm
          </span>
        </div>
      )}

      {loading ? (
        <div className="px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách nông sản...
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <PackageSearch className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            Không tìm thấy sản phẩm phù hợp
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Thử đổi bộ lọc tìm kiếm hoặc bấm &ldquo;Thêm Sản Phẩm Mới&rdquo; để tạo mặt hàng mới.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (< md) */}
          <div className="md:hidden divide-y divide-slate-100">
            {products.map((product) => {
              const isActive = product.status === "Dang_ban";
              const isToggling = togglingProdId === product.id;

              return (
                <article key={product.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start gap-3">
                    <img
                      src={product.image_url || DEFAULT_PROD_IMG}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = DEFAULT_PROD_IMG;
                      }}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-emerald-50"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                          {product.name}
                        </h3>
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleStatus(product)}
                          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isActive ? (
                            <Eye className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{isActive ? "Đang bán" : "Tạm ngưng"}</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <span className="font-mono text-slate-400">#{product.id}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
                          {product.category_name || "Chưa phân loại"}
                        </span>
                        {product.certificates_count > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                            <Award className="w-3 h-3" />
                            {product.certificates_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Thông số giá, tồn kho & tích điểm */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/90 border border-slate-200/70 p-2.5 text-xs tabular-nums">
                    <div>
                      <span className="block text-[10px] text-slate-400">Giá bán</span>
                      <span className="font-extrabold text-slate-900">
                        {Number(product.price).toLocaleString("vi-VN")}đ
                      </span>
                      {Number(product.current_price) < Number(product.price) && (
                        <span className="block text-[10px] font-bold text-orange-600">
                          Sale: {Number(product.current_price).toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Tồn FEFO</span>
                      <span
                        className={`font-bold ${
                          Number(product.available_stock) > 0
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {Number(product.available_stock || 0).toLocaleString("vi-VN")}{" "}
                        {product.unit}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] text-slate-400">Tích điểm</span>
                      <span className="inline-flex items-center gap-0.5 font-bold text-amber-700">
                        <Sparkles className="w-3 h-3" />
                        {Number(product.reward_point_rate || 0)}%
                      </span>
                    </div>
                  </div>

                  {/* Hành động trên mobile */}
                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onEditProduct(product)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct(product)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50/50 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>
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
                  <th className="py-3 px-5">Nông Sản</th>
                  <th className="py-3 px-4">Danh Mục</th>
                  <th className="py-3 px-4">Giá Niêm Yết</th>
                  <th className="py-3 px-4">Tồn Kho FEFO</th>
                  <th className="py-3 px-4">Tích Điểm</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {products.map((product) => {
                  const isActive = product.status === "Dang_ban";
                  const isToggling = togglingProdId === product.id;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={product.image_url || DEFAULT_PROD_IMG}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_PROD_IMG;
                            }}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-emerald-50"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate max-w-[220px]">
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="font-mono">#{product.id}</span>
                              <span>• ĐVT: {product.unit}</span>
                              {product.certificates_count > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                                  <Award className="w-3 h-3" />
                                  {product.certificates_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          {product.category_name || "Chưa phân loại"}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <div className="font-extrabold text-slate-800">
                          {Number(product.price).toLocaleString("vi-VN")}đ
                        </div>
                        {Number(product.current_price) < Number(product.price) && (
                          <div className="text-[11px] font-bold text-orange-600">
                            Flash Sale: {Number(product.current_price).toLocaleString("vi-VN")}đ
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <span
                          className={`font-bold ${
                            Number(product.available_stock) > 0
                              ? "text-emerald-700"
                              : "text-slate-400"
                          }`}
                        >
                          {Number(product.available_stock || 0).toLocaleString("vi-VN")}{" "}
                          {product.unit}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                          <Sparkles className="w-3 h-3" />
                          {Number(product.reward_point_rate || 0)}%
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => onToggleStatus(product)}
                          title="Bấm để chuyển đổi nhanh trạng thái mở bán / tạm ngưng"
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : isActive ? (
                            <Eye className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <EyeOff className="w-3 h-3 text-slate-500" />
                          )}
                          <span>{isActive ? "Đang mở bán" : "Tạm ngưng"}</span>
                        </button>
                      </td>

                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditProduct(product)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProduct(product)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa sản phẩm"
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