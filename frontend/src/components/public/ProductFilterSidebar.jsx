/* Thanh bộ lọc nông sản dạng ngang gọn nhẹ: danh mục, khoảng giá, chứng nhận và tình trạng hàng. */
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Flame,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import { formatCurrencyVnd } from "../../services/publicApi";
import { showGlobalToast } from "../GlobalToast";

const PRICE_PRESETS = [
  { id: "under-30k", label: "Dưới 30.000đ", min: "", max: "30000" },
  { id: "30k-50k", label: "30.000đ – 50.000đ", min: "30000", max: "50000" },
  { id: "50k-100k", label: "50.000đ – 100.000đ", min: "50000", max: "100000" },
  { id: "over-100k", label: "Trên 100.000đ", min: "100000", max: "" },
];

/* ================= POPOVER / BOTTOM SHEET 1: CHỌN KHOẢNG GIÁ ================= */
function PriceFilterDropdown({ minPrice = "", maxPrice = "", onApplyPrice }) {
  const [open, setOpen] = useState(false);
  const [draftMin, setDraftMin] = useState(minPrice || "");
  const [draftMax, setDraftMax] = useState(maxPrice || "");
  const containerRef = useRef(null);

  const hasPriceFilter = Boolean(minPrice || maxPrice);

  useEffect(() => {
    setDraftMin(minPrice || "");
    setDraftMax(maxPrice || "");
  }, [minPrice, maxPrice]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const activePreset = PRICE_PRESETS.find(
    (p) => String(minPrice || "") === p.min && String(maxPrice || "") === p.max
  );

  const triggerLabel = activePreset
    ? activePreset.label
    : hasPriceFilter
    ? `${minPrice ? formatCurrencyVnd(minPrice) : "0đ"} – ${
        maxPrice ? formatCurrencyVnd(maxPrice) : "∞"
      }`
    : "Khoảng giá";

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedMin = draftMin.trim();
    const cleanedMax = draftMax.trim();

    if (
      cleanedMin !== "" &&
      cleanedMax !== "" &&
      Number(cleanedMin) > Number(cleanedMax)
    ) {
      showGlobalToast("Giá tối thiểu không được lớn hơn giá tối đa.", "warning");
      return;
    }

    onApplyPrice(cleanedMin, cleanedMax);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`h-8 px-2.5 sm:px-3 rounded-full border text-[11.5px] sm:text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
          hasPriceFilter
            ? "bg-[#91f78e]/30 border-[#006e1c]/40 text-[#00450d] font-bold"
            : "bg-[#f8faf8] border-[#c0c9bb]/60 text-[#41493e] hover:border-[#00450d]/50 hover:bg-white"
        }`}
      >
        <Tag className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
        <span className="max-w-[130px] truncate">{triggerLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5a6357] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          {/* Nền mờ trên màn hình điện thoại */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/35 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="fixed inset-x-3 bottom-3 z-50 rounded-3xl sm:rounded-2xl sm:inset-auto sm:absolute sm:right-0 sm:mt-1.5 sm:w-72 bg-white border border-[#c0c9bb]/60 shadow-2xl sm:shadow-xl p-4 sm:p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] sm:text-[11.5px] font-extrabold uppercase tracking-wider text-[#191c1b]">
                Khoảng giá (VNĐ)
              </span>
              <div className="flex items-center gap-2">
                {hasPriceFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyPrice("", "");
                      setOpen(false);
                    }}
                    className="text-[11.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Xóa giá
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Đóng chọn khoảng giá"
                  className="sm:hidden p-1 rounded-full text-[#5a6357] hover:bg-[#f2f4f2]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((preset) => {
                const isActive =
                  String(minPrice || "") === preset.min &&
                  String(maxPrice || "") === preset.max;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (isActive) onApplyPrice("", "");
                      else onApplyPrice(preset.min, preset.max);
                      setOpen(false);
                    }}
                    className={`px-3 py-1.5 sm:px-2.5 sm:py-1 rounded-full text-[12px] sm:text-[11.5px] font-semibold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#00450d] text-white"
                        : "bg-[#f2f4f2] text-[#41493e] hover:bg-[#e6e9e7]"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleSubmit}
              className="pt-2.5 border-t border-[#c0c9bb]/30 space-y-2.5"
            >
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  placeholder="Từ (đ)"
                  value={draftMin}
                  onChange={(e) => setDraftMin(e.target.value)}
                  className="w-full px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#f8faf8] border border-[#c0c9bb]/60 text-[13px] sm:text-[12px] text-[#191c1b] tabular-nums outline-none focus:border-[#00450d] focus:bg-white"
                />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  inputMode="numeric"
                  placeholder="Đến (đ)"
                  value={draftMax}
                  onChange={(e) => setDraftMax(e.target.value)}
                  className="w-full px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#f8faf8] border border-[#c0c9bb]/60 text-[13px] sm:text-[12px] text-[#191c1b] tabular-nums outline-none focus:border-[#00450d] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 sm:py-1.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-[12.5px] sm:text-[12px] font-bold transition-colors cursor-pointer"
              >
                Áp dụng khoảng giá
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

/* ================= POPOVER / BOTTOM SHEET 2: CHỌN CHỨNG NHẬN ================= */
function CertificationFilterDropdown({
  availableCertifications = [],
  selectedCerts = [],
  onToggleCert,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  if (!availableCertifications.length) return null;

  const hasCerts = selectedCerts.length > 0;

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`h-8 px-2.5 sm:px-3 rounded-full border text-[11.5px] sm:text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
          hasCerts
            ? "bg-[#91f78e]/30 border-[#006e1c]/40 text-[#00450d] font-bold"
            : "bg-[#f8faf8] border-[#c0c9bb]/60 text-[#41493e] hover:border-[#00450d]/50 hover:bg-white"
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
        <span>
          {hasCerts ? `Chứng nhận (${selectedCerts.length})` : "Chứng nhận"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5a6357] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/35 sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="fixed inset-x-3 bottom-3 z-50 rounded-3xl sm:rounded-2xl sm:inset-auto sm:absolute sm:right-0 sm:mt-1.5 sm:w-64 bg-white border border-[#c0c9bb]/60 shadow-2xl sm:shadow-xl p-3.5 sm:p-2.5 space-y-1">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-[#5a6357]">
                Tiêu chuẩn chất lượng
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng chọn chứng nhận"
                className="sm:hidden p-1 rounded-full text-[#5a6357] hover:bg-[#f2f4f2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {availableCertifications.map((cert) => {
              const isChecked = selectedCerts.includes(cert.label);
              return (
                <button
                  key={cert.label}
                  type="button"
                  onClick={() => onToggleCert(cert.label)}
                  aria-pressed={isChecked}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 sm:px-2.5 sm:py-1.5 rounded-xl text-[12.5px] sm:text-[12px] transition-colors cursor-pointer ${
                    isChecked
                      ? "bg-[#91f78e]/25 text-[#00450d] font-bold"
                      : "text-[#41493e] hover:bg-[#f2f4f2] font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                        isChecked
                          ? "bg-[#00450d] border-[#00450d] text-white"
                          : "bg-white border-[#c0c9bb]"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="truncate text-left">{cert.label}</span>
                  </span>
                  <span className="text-[11px] font-bold text-[#5a6357] tabular-nums shrink-0">
                    {cert.count}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= THÀNH PHẦN CHÍNH: THANH BỘ LỌC NGANG GỌN NHẸ ================= */
export default function ProductFilterSidebar({
  categories = [],
  facets = {},
  filters = {},
  activeFilterCount = 0,
  onSelectCategory,
  onApplyPrice,
  onToggleCert,
  onToggleInStock,
  onToggleFlashSale,
  onResetFilters,
}) {
  const summary = facets?.summary || {};
  const availableCertifications = facets?.available_certifications || [];
  const totalProducts =
    summary.total_products ??
    categories.reduce((acc, item) => acc + (item.product_count || 0), 0);

  return (
    <div
      aria-label="Thanh lọc nông sản nhanh"
      className="flex items-center gap-1.5 overflow-x-auto sm:overflow-visible pt-2 border-t border-[#c0c9bb]/30 pb-0.5 sm:pb-0"
    >
      {/* Dải chip Danh mục nông sản */}
      <div className="flex items-center gap-1.5 sm:overflow-x-auto min-w-0 shrink-0 sm:shrink sm:flex-1">
        <span className="hidden sm:inline-flex items-center gap-1 text-[11.5px] font-bold text-[#5a6357] mr-0.5 shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#00450d]" />
          <span>Danh mục:</span>
        </span>

        <button
          type="button"
          onClick={() => onSelectCategory("")}
          className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            !filters.category
              ? "bg-[#00450d] text-white font-bold shadow-2xs"
              : "bg-[#f2f4f2] text-[#41493e] hover:bg-[#e6e9e7] hover:text-[#00450d] font-semibold"
          }`}
        >
          <span>Tất cả</span>
          <span
            className={`text-[10px] sm:text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums ${
              !filters.category
                ? "bg-white/20 text-white"
                : "bg-white text-[#5a6357]"
            }`}
          >
            {totalProducts}
          </span>
        </button>

        {categories.map((cat) => {
          const isSelected = String(filters.category) === String(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(isSelected ? "" : String(cat.id))}
              className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] whitespace-nowrap inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-[#00450d] text-white font-bold shadow-2xs"
                  : "bg-[#f2f4f2] text-[#41493e] hover:bg-[#e6e9e7] hover:text-[#00450d] font-semibold"
              }`}
            >
              <span>{cat.name}</span>
              <span
                className={`text-[10px] sm:text-[10.5px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-white text-[#5a6357]"
                }`}
              >
                {cat.product_count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Vách ngăn mảnh trên mobile */}
      <span className="h-4 w-px bg-[#c0c9bb]/50 shrink-0 sm:hidden" aria-hidden="true" />

      {/* Nhóm nút lọc nhanh */}
      <div className="flex items-center gap-1.5 shrink-0">
        <PriceFilterDropdown
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onApplyPrice={onApplyPrice}
        />

        <CertificationFilterDropdown
          availableCertifications={availableCertifications}
          selectedCerts={filters.certifications || []}
          onToggleCert={onToggleCert}
        />

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(filters.inStock)}
          onClick={onToggleInStock}
          className={`h-8 px-2.5 sm:px-3 rounded-full border text-[11.5px] sm:text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            filters.inStock
              ? "bg-[#91f78e]/30 border-[#006e1c]/40 text-[#00450d] font-bold"
              : "bg-[#f8faf8] border-[#c0c9bb]/60 text-[#41493e] hover:border-[#00450d]/50 hover:bg-white"
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
          <span>Còn hàng</span>
          {typeof summary.in_stock_count === "number" && (
            <span className="hidden md:inline text-[11px] text-[#5a6357] tabular-nums">
              ({summary.in_stock_count})
            </span>
          )}
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={Boolean(filters.flashSale)}
          onClick={onToggleFlashSale}
          className={`h-8 px-2.5 sm:px-3 rounded-full border text-[11.5px] sm:text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
            filters.flashSale
              ? "bg-orange-50 border-orange-300 text-orange-700 font-bold"
              : "bg-[#f8faf8] border-[#c0c9bb]/60 text-[#41493e] hover:border-orange-300 hover:bg-white"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span>Flash Sale</span>
          {typeof summary.flash_sale_count === "number" && (
            <span className="hidden md:inline text-[11px] text-[#5a6357] tabular-nums">
              ({summary.flash_sale_count})
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="h-8 px-2.5 rounded-full text-[11.5px] sm:text-[12px] font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Đặt lại toàn bộ bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>
    </div>
  );
}