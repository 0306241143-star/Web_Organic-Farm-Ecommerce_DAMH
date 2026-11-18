/* Modular filter sidebar for searching and filtering agricultural products by category, price, certification, and stock. */
import { useState } from "react";
import {
  Check,
  Flame,
  FolderTree,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
} from "lucide-react";
import Button from "../common/Button";
import { showGlobalToast } from "../GlobalToast";

const PRICE_PRESETS = [
  { id: "under-30k", label: "Dưới 30.000đ", min: "", max: "30000" },
  { id: "30k-50k", label: "30.000đ – 50.000đ", min: "30000", max: "50000" },
  { id: "50k-100k", label: "50.000đ – 100.000đ", min: "50000", max: "100000" },
  { id: "over-100k", label: "Trên 100.000đ", min: "100000", max: "" },
];

/* ================= SUB-COMPONENT 1: FILTER GROUP SHELL ================= */
function FilterGroupSection({ icon: Icon, title, children }) {
  return (
    <section className="py-4 border-b border-[#c0c9bb]/30 last:border-b-0">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-[#006e1c] shrink-0" aria-hidden="true" />}
        <h3 className="text-[13px] font-extrabold text-[#191c1b] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/* ================= SUB-COMPONENT 2: CATEGORY FILTER LIST ================= */
function CategoryFilterSection({
  categories = [],
  selectedCategory = "",
  totalProducts = 0,
  onSelectCategory,
}) {
  return (
    <FilterGroupSection icon={FolderTree} title="Danh mục nông sản">
      <ul className="space-y-1">
        <li>
          <button
            type="button"
            onClick={() => onSelectCategory("")}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13.5px] transition-colors cursor-pointer ${
              !selectedCategory
                ? "bg-[#00450d] text-white font-bold shadow-2xs"
                : "text-[#41493e] hover:bg-[#f2f4f2] font-medium"
            }`}
          >
            <span className="truncate">Tất cả danh mục</span>
            <span
              className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                !selectedCategory
                  ? "bg-white/20 text-white"
                  : "bg-[#f2f4f2] text-[#5a6357]"
              }`}
            >
              {totalProducts}
            </span>
          </button>
        </li>

        {categories.map((cat) => {
          const isSelected = String(selectedCategory) === String(cat.id);
          return (
            <li key={cat.id}>
              <button
                type="button"
                onClick={() => onSelectCategory(String(cat.id))}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13.5px] transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#00450d] text-white font-bold shadow-2xs"
                    : "text-[#41493e] hover:bg-[#f2f4f2] font-medium"
                }`}
              >
                <span className="truncate text-left">{cat.name}</span>
                <span
                  className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full tabular-nums shrink-0 ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-[#f2f4f2] text-[#5a6357]"
                  }`}
                >
                  {cat.product_count ?? 0}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </FilterGroupSection>
  );
}

/* ================= SUB-COMPONENT 3: PRICE RANGE FILTER ================= */
function PriceRangeFilterSection({ minPrice = "", maxPrice = "", onApplyPrice }) {
  const [draftMin, setDraftMin] = useState(minPrice || "");
  const [draftMax, setDraftMax] = useState(maxPrice || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanedMin = draftMin.trim();
    const cleanedMax = draftMax.trim();

    if (
      cleanedMin !== "" &&
      cleanedMax !== "" &&
      Number(cleanedMin) > Number(cleanedMax)
    ) {
      showGlobalToast(
        "Giá tối thiểu không được lớn hơn giá tối đa.",
        "warning"
      );
      return;
    }

    onApplyPrice(cleanedMin, cleanedMax);
  };

  return (
    <FilterGroupSection icon={Tag} title="Khoảng giá (VNĐ)">
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRICE_PRESETS.map((preset) => {
          const isActive =
            String(minPrice || "") === preset.min &&
            String(maxPrice || "") === preset.max;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() =>
                isActive
                  ? onApplyPrice("", "")
                  : onApplyPrice(preset.min, preset.max)
              }
              className={`px-2.5 py-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-[#006e1c] text-white shadow-2xs"
                  : "bg-[#f2f4f2] text-[#41493e] hover:bg-[#e6e9e7] hover:text-[#00450d]"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="filter-min-price"
              className="block text-[11px] font-semibold text-[#5a6357] mb-1"
            >
              Từ (đ)
            </label>
            <input
              id="filter-min-price"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder="0"
              value={draftMin}
              onChange={(e) => setDraftMin(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#f8faf8] border border-[#c0c9bb]/60 text-[13px] text-[#191c1b] tabular-nums outline-none focus:border-[#00450d] focus:bg-white transition-colors"
            />
          </div>
          <div>
            <label
              htmlFor="filter-max-price"
              className="block text-[11px] font-semibold text-[#5a6357] mb-1"
            >
              Đến (đ)
            </label>
            <input
              id="filter-max-price"
              type="number"
              min="0"
              step="1000"
              inputMode="numeric"
              placeholder="200000"
              value={draftMax}
              onChange={(e) => setDraftMax(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#f8faf8] border border-[#c0c9bb]/60 text-[13px] text-[#191c1b] tabular-nums outline-none focus:border-[#00450d] focus:bg-white transition-colors"
            />
          </div>
        </div>

        <Button type="submit" variant="outline" size="sm" className="w-full">
          Áp dụng khoảng giá
        </Button>
      </form>
    </FilterGroupSection>
  );
}

/* ================= SUB-COMPONENT 4: CERTIFICATION FILTER ================= */
function CertificationFilterSection({
  availableCertifications = [],
  selectedCerts = [],
  onToggleCert,
}) {
  if (!availableCertifications.length) return null;

  return (
    <FilterGroupSection icon={ShieldCheck} title="Chứng nhận chất lượng">
      <div className="space-y-1.5">
        {availableCertifications.map((cert) => {
          const isChecked = selectedCerts.includes(cert.label);
          return (
            <button
              key={cert.label}
              type="button"
              onClick={() => onToggleCert(cert.label)}
              aria-pressed={isChecked}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border text-[13px] transition-all cursor-pointer ${
                isChecked
                  ? "bg-[#91f78e]/25 border-[#006e1c]/40 text-[#00450d] font-bold"
                  : "bg-white border-[#c0c9bb]/35 text-[#41493e] hover:bg-[#f2f4f2] font-medium"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isChecked
                      ? "bg-[#00450d] border-[#00450d] text-white"
                      : "bg-white border-[#c0c9bb]"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="truncate text-left">{cert.label}</span>
              </span>
              <span className="text-[11.5px] font-bold text-[#5a6357] tabular-nums shrink-0">
                {cert.count}
              </span>
            </button>
          );
        })}
      </div>
    </FilterGroupSection>
  );
}

/* ================= SUB-COMPONENT 5: STOCK & FLASH SALE SWITCHES ================= */
function AvailabilityFilterSection({
  inStockOnly = false,
  flashSaleOnly = false,
  summary = {},
  onToggleInStock,
  onToggleFlashSale,
}) {
  return (
    <FilterGroupSection icon={PackageCheck} title="Tình trạng">
      <div className="space-y-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={inStockOnly}
          onClick={onToggleInStock}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#f8faf8] hover:bg-[#f2f4f2] border border-[#c0c9bb]/30 transition-colors cursor-pointer"
        >
          <span className="text-left">
            <span className="block text-[13px] font-bold text-[#191c1b]">
              Chỉ hiện còn hàng
            </span>
            <span className="block text-[11px] text-[#5a6357] tabular-nums">
              {summary.in_stock_count ?? 0} sản phẩm
            </span>
          </span>
          <span
            className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
              inStockOnly ? "bg-[#006e1c] justify-end" : "bg-[#c0c9bb]/70 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-2xs" />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={flashSaleOnly}
          onClick={onToggleFlashSale}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[#f8faf8] hover:bg-[#f2f4f2] border border-[#c0c9bb]/30 transition-colors cursor-pointer"
        >
          <span className="text-left flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 text-orange-500 shrink-0" />
            <span className="min-w-0">
              <span className="block text-[13px] font-bold text-[#191c1b] truncate">
                Flash Sale
              </span>
              <span className="block text-[11px] text-[#5a6357] tabular-nums">
                {summary.flash_sale_count ?? 0} sản phẩm
              </span>
            </span>
          </span>
          <span
            className={`w-10 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
              flashSaleOnly ? "bg-orange-500 justify-end" : "bg-[#c0c9bb]/70 justify-start"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-2xs" />
          </span>
        </button>
      </div>
    </FilterGroupSection>
  );
}

/* ================= MAIN COMPONENT: PRODUCT FILTER SIDEBAR ================= */
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
  isMobileDrawer = false,
}) {
  const summary = facets?.summary || {};
  const availableCertifications = facets?.available_certifications || [];
  const totalProducts =
    summary.total_products ??
    categories.reduce((acc, item) => acc + (item.product_count || 0), 0);

  return (
    <aside
      aria-label="Bộ lọc nông sản"
      className={
        isMobileDrawer
          ? "w-full"
          : "rounded-3xl bg-white border border-[#c0c9bb]/35 p-5 shadow-2xs sticky top-24"
      }
    >
      <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#c0c9bb]/35">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#f2f4f2] text-[#00450d] flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[15px] font-extrabold text-[#191c1b] leading-tight">
              Bộ lọc tìm kiếm
            </h2>
            {activeFilterCount > 0 && (
              <p className="text-[11px] font-semibold text-[#006e1c] tabular-nums">
                Đang áp dụng {activeFilterCount} tiêu chí
              </p>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[12px] font-bold text-[#00450d] hover:bg-[#f2f4f2] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Đặt lại
          </button>
        )}
      </div>

      <CategoryFilterSection
        categories={categories}
        selectedCategory={filters.category}
        totalProducts={totalProducts}
        onSelectCategory={onSelectCategory}
      />

      <PriceRangeFilterSection
        key={`${filters.minPrice || ""}-${filters.maxPrice || ""}`}
        minPrice={filters.minPrice}
        maxPrice={filters.maxPrice}
        onApplyPrice={onApplyPrice}
      />

      <CertificationFilterSection
        availableCertifications={availableCertifications}
        selectedCerts={filters.certifications || []}
        onToggleCert={onToggleCert}
      />

      <AvailabilityFilterSection
        inStockOnly={Boolean(filters.inStock)}
        flashSaleOnly={Boolean(filters.flashSale)}
        summary={summary}
        onToggleInStock={onToggleInStock}
        onToggleFlashSale={onToggleFlashSale}
      />
    </aside>
  );
}
