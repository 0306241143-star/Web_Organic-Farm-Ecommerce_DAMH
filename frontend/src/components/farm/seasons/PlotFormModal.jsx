import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ChevronDown, Loader2, Pencil, Search, Sprout, X } from "lucide-react";

function ProductSelectDropdown({
  products = [],
  value,
  onChange,
  placeholder = "Chọn loại rau / củ / quả",
  labelId,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const selectedProduct = products.find((p) => String(p.id) === String(value));
  const filtered = query.trim()
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : products;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className={`w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
            : "border-slate-300 hover:border-slate-400 hover:bg-white"
        }`}
      >
        <span
          className={`truncate flex-1 min-w-0 ${
            selectedProduct ? "font-semibold text-slate-800" : "text-slate-500"
          }`}
        >
          {selectedProduct ? `${selectedProduct.name} (${selectedProduct.unit})` : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full mt-1.5 z-30 w-full max-w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {products.length > 6 && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm nhanh nông sản..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                Không tìm thấy nông sản phù hợp.
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = String(value) === String(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(String(p.id));
                      setIsOpen(false);
                    }}
                    className={`w-full min-w-0 text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs sm:text-[13px] break-words min-w-0 flex-1 leading-snug">
                      {p.name}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.unit}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlotFormModal({
  isAddPlotOpen,
  setIsAddPlotOpen,
  activeSeasonForPlot,
  plotError,
  plotForm,
  setPlotForm,
  handleCreatePlot,
  plotSubmitting,
  products,
  isEditPlotOpen,
  editingPlot,
  setIsEditPlotOpen,
  editPlotError,
  editPlotForm,
  setEditPlotForm,
  handleUpdatePlot,
  editPlotSubmitting,
}) {
  return (
    <>
      {/* Modal: Thêm Lô Canh Tác vào Mùa Vụ */}
      {isAddPlotOpen && activeSeasonForPlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#064e2e] text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 truncate text-white">
                  <Sprout className="w-5 h-5 text-[#86efac] shrink-0" />
                  <span>Thêm Lô Canh Tác Mới</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-emerald-200 truncate">Mùa vụ: {activeSeasonForPlot.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPlotOpen(false)}
                className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="add-plot-form" onSubmit={handleCreatePlot} className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-left">
              {plotError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{plotError}</span>
                </div>
              )}

              <div>
                <label
                  id="add-plot-product-label"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Chọn Loại Nông Sản Gieo Trồng <span className="text-red-500">*</span>
                </label>
                <ProductSelectDropdown
                  products={products}
                  value={plotForm.product_id}
                  onChange={(val) => setPlotForm({ ...plotForm, product_id: val })}
                  placeholder="Chọn loại rau / củ / quả"
                  labelId="add-plot-product-label"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Lô Canh Tác <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lô B01 - Cải Xoăn Kale"
                  value={plotForm.plot_name}
                  onChange={(e) => setPlotForm({ ...plotForm, plot_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Diện Tích (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="VD: 1200"
                    value={plotForm.area_m2}
                    onChange={(e) => setPlotForm({ ...plotForm, area_m2: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày Gieo Trồng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={plotForm.planting_date}
                    onChange={(e) => setPlotForm({ ...plotForm, planting_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            </form>

            <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-50/95 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddPlotOpen(false)}
                disabled={plotSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="add-plot-form"
                disabled={plotSubmitting}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {plotSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Thêm Lô Canh Tác</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Điều Chỉnh Diện Tích & Thông Tin Lô Canh Tác */}
      {isEditPlotOpen && editingPlot && activeSeasonForPlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#064e2e] text-white flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 truncate text-white">
                  <Pencil className="w-4 h-4 text-[#86efac] shrink-0" />
                  <span>Điều Chỉnh Diện Tích & Lô</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-emerald-200 truncate">Mùa vụ: {activeSeasonForPlot.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPlotOpen(false)}
                className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form id="edit-plot-form" onSubmit={handleUpdatePlot} className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-left">
              {editPlotError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{editPlotError}</span>
                </div>
              )}

              {/* Ô nhập Diện Tích (Nổi bật) */}
              <div className="p-3 sm:p-3.5 bg-emerald-50/70 border-2 border-emerald-500/40 rounded-2xl">
                <label className="block text-xs font-extrabold text-emerald-900 uppercase tracking-wider mb-1">
                  Diện Tích Canh Tác (m²) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="VD: 1500"
                    value={editPlotForm.area_m2}
                    onChange={(e) => setEditPlotForm({ ...editPlotForm, area_m2: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                    m²
                  </span>
                </div>
                <p className="text-[10.5px] sm:text-[11px] text-emerald-800 mt-1.5">
                  Thay đổi diện tích lô sẽ tự động đồng bộ lại tổng diện tích toàn mùa vụ.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Lô Canh Tác <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editPlotForm.plot_name}
                  onChange={(e) => setEditPlotForm({ ...editPlotForm, plot_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div>
                <label
                  id="edit-plot-product-label"
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Loại Nông Sản Giống Trồng
                </label>
                <ProductSelectDropdown
                  products={products}
                  value={editPlotForm.product_id}
                  onChange={(val) => setEditPlotForm({ ...editPlotForm, product_id: val })}
                  placeholder="Giữ nguyên hoặc chọn loại khác"
                  labelId="edit-plot-product-label"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ngày Gieo Trồng
                  </label>
                  <input
                    type="date"
                    value={editPlotForm.planting_date}
                    onChange={(e) => setEditPlotForm({ ...editPlotForm, planting_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trạng Thái Lô
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                    {[
                      { value: "Dang_canh_tac", label: "Đang canh tác" },
                      { value: "Da_thu_hoach", label: "Đã thu hoạch" },
                    ].map((opt) => {
                      const active = editPlotForm.status === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditPlotForm({ ...editPlotForm, status: opt.value })}
                          className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer truncate ${
                            active
                              ? "bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200"
                              : "text-slate-600 hover:text-slate-800"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>

            <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-50/95 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditPlotOpen(false)}
                disabled={editPlotSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                form="edit-plot-form"
                disabled={editPlotSubmitting}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {editPlotSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Lưu Điều Chỉnh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
