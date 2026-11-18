/* Searchable and multi-criteria filterable agricultural product catalog page synced with URL query parameters. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Badge from "../../components/common/Badge";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import ProductCard, {
  ProductCardSkeleton,
} from "../../components/public/ProductCard";
import ProductFilterSidebar from "../../components/public/ProductFilterSidebar";
import { formatCurrencyVnd, publicApi } from "../../services/publicApi";

const SORT_OPTIONS = [
  { value: "featured", label: "Nổi bật & Tươi mới" },
  { value: "newest", label: "Mới cập nhật nhất" },
  { value: "price_asc", label: "Giá: Thấp đến Cao" },
  { value: "price_desc", label: "Giá: Cao đến Thấp" },
  { value: "name_asc", label: "Tên sản phẩm: A → Z" },
  { value: "stock_desc", label: "Còn hàng nhiều nhất" },
];

const PER_PAGE = 12;

/* ================= SUB-COMPONENT 1: CATALOG HEADER & SEARCH BAR ================= */
function CatalogHeroHeader({
  activeCategoryObj,
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onClearSearch,
  totalResults,
  loading,
}) {
  return (
    <section className="border-b border-[#c0c9bb]/30 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 sm:py-9">
        {/* Breadcrumb */}
        <nav
          aria-label="Đường dẫn điều hướng"
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#5a6357] mb-3"
        >
          <Link to="/" className="hover:text-[#00450d] transition-colors">
            Trang chủ
          </Link>
          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          <Link
            to="/products"
            className={
              activeCategoryObj
                ? "hover:text-[#00450d] transition-colors"
                : "text-[#00450d] font-bold"
            }
          >
            Nông sản
          </Link>
          {activeCategoryObj && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[#00450d] font-bold truncate">
                {activeCategoryObj.name}
              </span>
            </>
          )}
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1
                className="text-[26px] sm:text-[32px] font-extrabold text-[#00450d] tracking-tight leading-tight"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                {activeCategoryObj ? activeCategoryObj.name : "Danh mục nông sản sạch"}
              </h1>
              <Badge variant="success" size="sm" className="tabular-nums">
                {loading ? "Đang tải..." : `${totalResults} sản phẩm`}
              </Badge>
            </div>
            {activeCategoryObj?.description && (
              <p className="text-[14px] text-[#41493e] leading-relaxed">
                {activeCategoryObj.description}
              </p>
            )}
          </div>

          {/* Search Bar */}
          <form
            onSubmit={onSearchSubmit}
            className="w-full lg:w-[420px] flex items-center gap-2 bg-[#f8faf8] p-1.5 rounded-2xl border border-[#c0c9bb]/60 focus-within:border-[#00450d] focus-within:bg-white transition-all"
          >
            <div className="relative flex-1 flex items-center min-w-0">
              <Search
                className="w-4 h-4 text-[#5a6357] absolute left-3 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => onSearchInputChange(e.target.value)}
                placeholder="Tìm tên nông sản, chứng nhận..."
                aria-label="Nhập từ khóa tìm kiếm nông sản"
                className="w-full pl-9 pr-8 py-2 text-[13.5px] text-[#191c1b] placeholder:text-[#5a6357] bg-transparent outline-none"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Xóa từ khóa tìm kiếm"
                  className="absolute right-2 p-1 rounded-lg text-[#5a6357] hover:text-[#191c1b] hover:bg-[#e6e9e7] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Button type="submit" variant="primary" size="sm" className="shrink-0">
              Tìm kiếm
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

/* ================= SUB-COMPONENT 2: CONTAINER-LOCKED CUSTOM SORT DROPDOWN ================= */
function CatalogSortDropdown({ value = "featured", onChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption =
    SORT_OPTIONS.find((opt) => opt.value === value) || SORT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full sm:w-60">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#c0c9bb]/60 hover:border-[#00450d]/50 text-[13px] font-semibold text-[#191c1b] flex items-center justify-between gap-2 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
          <span className="truncate">{selectedOption.label}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#5a6357] shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sắp xếp danh sách nông sản"
          className="absolute left-0 right-0 mt-1.5 w-full max-w-full overflow-hidden rounded-2xl bg-white border border-[#c0c9bb]/50 shadow-xl py-1.5 z-30"
        >
          {SORT_OPTIONS.map((option) => {
            const isSelected = option.value === selectedOption.value;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-[13px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#91f78e]/30 text-[#00450d] font-bold"
                      : "text-[#41493e] hover:bg-[#f2f4f2] font-medium"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#00450d] shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ================= SUB-COMPONENT 3: ACTIVE FILTER CHIPS BAR ================= */
function CatalogActiveFilterPills({
  filters,
  activeCategoryObj,
  onRemoveSearch,
  onRemoveCategory,
  onRemovePrice,
  onRemoveCert,
  onRemoveInStock,
  onRemoveFlashSale,
  onResetAll,
}) {
  const pills = [];

  if (filters.search) {
    pills.push({
      key: "search",
      label: `Từ khóa: "${filters.search}"`,
      onRemove: onRemoveSearch,
    });
  }
  if (activeCategoryObj) {
    pills.push({
      key: "category",
      label: `Danh mục: ${activeCategoryObj.name}`,
      onRemove: onRemoveCategory,
    });
  }
  if (filters.minPrice || filters.maxPrice) {
    const minLabel = filters.minPrice ? formatCurrencyVnd(filters.minPrice) : "0đ";
    const maxLabel = filters.maxPrice ? formatCurrencyVnd(filters.maxPrice) : "Trở lên";
    pills.push({
      key: "price",
      label: `Giá: ${minLabel} – ${maxLabel}`,
      onRemove: onRemovePrice,
    });
  }
  (filters.certifications || []).forEach((cert) => {
    pills.push({
      key: `cert-${cert}`,
      label: `Chứng nhận: ${cert}`,
      onRemove: () => onRemoveCert(cert),
    });
  });
  if (filters.inStock) {
    pills.push({
      key: "in_stock",
      label: "Còn hàng",
      onRemove: onRemoveInStock,
    });
  }
  if (filters.flashSale) {
    pills.push({
      key: "flash_sale",
      label: "Flash Sale",
      onRemove: onRemoveFlashSale,
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pb-4">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#91f78e]/30 border border-[#006e1c]/25 text-[#00450d] text-[12px] font-bold"
        >
          <span>{pill.label}</span>
          <button
            type="button"
            onClick={pill.onRemove}
            aria-label={`Bỏ lọc ${pill.label}`}
            className="p-0.5 rounded-full hover:bg-[#00450d] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onResetAll}
        className="px-2.5 py-1.5 rounded-full text-[12px] font-bold text-[#5a6357] hover:text-[#00450d] hover:bg-[#f2f4f2] transition-colors cursor-pointer"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

/* ================= SUB-COMPONENT 4: MOBILE FILTER DRAWER ================= */
function CatalogMobileFilterDrawer({ open, onClose, sidebarProps }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bộ lọc tìm kiếm nông sản"
      className="fixed inset-0 z-50 lg:hidden flex justify-end bg-slate-900/45 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[#c0c9bb]/35 flex items-center justify-between">
          <span className="text-[15px] font-extrabold text-[#00450d]">
            Bộ lọc nông sản
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bộ lọc"
            className="p-2 rounded-xl text-[#41493e] hover:bg-[#f2f4f2] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <ProductFilterSidebar {...sidebarProps} isMobileDrawer />
        </div>

        <div className="px-5 py-4 border-t border-[#c0c9bb]/35 bg-[#f8faf8]">
          <Button variant="primary" size="md" className="w-full" onClick={onClose}>
            Xem kết quả lọc
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================= SUB-COMPONENT 5: PRODUCT GRID & STATES ================= */
function CatalogProductGrid({
  products,
  loading,
  errorMessage,
  pagination,
  onRetry,
  onResetFilters,
  onPageChange,
}) {
  if (errorMessage) {
    return (
      <EmptyState
        icon={RefreshCw}
        title="Không thể tải danh sách nông sản"
        message={errorMessage}
        actionLabel="Thử tải lại"
        onAction={onRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Không có nông sản nào khớp bộ lọc"
        message="Hãy thử nới lỏng khoảng giá, đổi từ khóa hoặc xóa bớt tiêu chuẩn chứng nhận đang chọn."
        actionLabel="Đặt lại toàn bộ bộ lọc"
        onAction={onResetFilters}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <Pagination
        currentPage={pagination.current_page}
        lastPage={pagination.last_page}
        total={pagination.total}
        perPage={pagination.per_page}
        onPageChange={onPageChange}
        itemLabel="nông sản"
      />
    </div>
  );
}

/* ================= MAIN PAGE COMPONENT: PRODUCT CATALOG PAGE ================= */
export default function ProductCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState({
    available_certifications: [],
    price_bounds: { min: 0, max: 0 },
    summary: { total_products: 0, in_stock_count: 0, flash_sale_count: 0 },
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: PER_PAGE,
    total: 0,
    last_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const requestSeqRef = useRef(0);

  // Đọc trạng thái lọc đồng bộ trực tiếp từ URL Query String
  const filters = useMemo(() => {
    const rawCert = searchParams.get("cert") || "";
    const certifications = rawCert
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return {
      search: (searchParams.get("search") || "").trim(),
      category: (searchParams.get("category") || "").trim(),
      minPrice: (searchParams.get("min_price") || "").trim(),
      maxPrice: (searchParams.get("max_price") || "").trim(),
      certifications,
      inStock: searchParams.get("in_stock") === "1",
      flashSale: searchParams.get("flash_sale") === "1",
      sort: searchParams.get("sort") || "featured",
      page: Math.max(1, Number(searchParams.get("page") || 1) || 1),
    };
  }, [searchParams]);

  // Lưu nháp từ khóa người dùng đang gõ (null = tự đồng bộ theo URL)
  const [searchDraft, setSearchDraft] = useState(null);
  const searchInput = searchDraft ?? filters.search;

  const updateQueryParams = useCallback(
    (patch, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);

      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === false) {
          next.delete(key);
        } else if (value === true) {
          next.set(key, "1");
        } else {
          next.set(key, String(value));
        }
      });

      if (resetPage) {
        next.delete("page");
      }

      setLoading(true);
      setErrorMessage("");
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // Debounce từ khóa tìm kiếm nhẹ 350ms khi người dùng gõ trực tiếp
  useEffect(() => {
    if (searchDraft === null) return undefined;
    const trimmed = searchDraft.trim();
    if (trimmed === filters.search) return undefined;

    const timer = setTimeout(() => {
      updateQueryParams({ search: trimmed });
      setSearchDraft(null);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchDraft, filters.search, updateQueryParams]);

  // Tải danh sách danh mục 1 lần
  useEffect(() => {
    let active = true;
    publicApi
      .getCategories()
      .then((res) => {
        if (active && Array.isArray(res?.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {
        // Lỗi tải danh mục đã được interceptor xử lý tập trung
      });

    return () => {
      active = false;
    };
  }, []);

  // Tải sản phẩm theo bộ lọc hiện tại
  useEffect(() => {
    const seq = ++requestSeqRef.current;

    publicApi
      .getProducts({
        search: filters.search,
        category: filters.category,
        min_price: filters.minPrice,
        max_price: filters.maxPrice,
        cert: filters.certifications.join(","),
        in_stock: filters.inStock,
        flash_sale: filters.flashSale,
        sort: filters.sort,
        page: filters.page,
        per_page: PER_PAGE,
      })
      .then((res) => {
        if (seq !== requestSeqRef.current) return;
        setProducts(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta) {
          setPagination({
            current_page: res.meta.current_page ?? 1,
            per_page: res.meta.per_page ?? PER_PAGE,
            total: res.meta.total ?? 0,
            last_page: res.meta.last_page ?? 1,
          });
          if (res.meta.facets) {
            setFacets(res.meta.facets);
          }
        }
        setErrorMessage("");
      })
      .catch((err) => {
        if (seq !== requestSeqRef.current) return;
        setErrorMessage(
          err?.message || "Không thể tải danh sách nông sản. Vui lòng thử lại."
        );
      })
      .finally(() => {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      });
  }, [filters, reloadTick]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setErrorMessage("");
    setReloadTick((tick) => tick + 1);
  }, []);

  const activeCategoryObj = useMemo(
    () => categories.find((cat) => String(cat.id) === String(filters.category)) || null,
    [categories, filters.category]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count += 1;
    if (filters.category) count += 1;
    if (filters.minPrice || filters.maxPrice) count += 1;
    count += filters.certifications.length;
    if (filters.inStock) count += 1;
    if (filters.flashSale) count += 1;
    return count;
  }, [filters]);

  const handleToggleCertification = useCallback(
    (label) => {
      const exists = filters.certifications.includes(label);
      const nextCerts = exists
        ? filters.certifications.filter((item) => item !== label)
        : [...filters.certifications, label];

      updateQueryParams({ cert: nextCerts.join(",") });
    },
    [filters.certifications, updateQueryParams]
  );

  const handleResetFilters = useCallback(() => {
    setSearchDraft(null);
    setLoading(true);
    setErrorMessage("");
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (nextPage) => {
      updateQueryParams(
        { page: nextPage > 1 ? nextPage : "" },
        { resetPage: false }
      );
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateQueryParams]
  );

  const sidebarProps = {
    categories,
    facets,
    filters,
    activeFilterCount,
    onSelectCategory: (catId) => updateQueryParams({ category: catId }),
    onApplyPrice: (min, max) =>
      updateQueryParams({ min_price: min, max_price: max }),
    onToggleCert: handleToggleCertification,
    onToggleInStock: () => updateQueryParams({ in_stock: !filters.inStock }),
    onToggleFlashSale: () =>
      updateQueryParams({ flash_sale: !filters.flashSale }),
    onResetFilters: handleResetFilters,
  };

  return (
    <div className="pb-10">
      <CatalogHeroHeader
        activeCategoryObj={activeCategoryObj}
        searchInput={searchInput}
        onSearchInputChange={setSearchDraft}
        onSearchSubmit={(e) => {
          e.preventDefault();
          const trimmed = searchInput.trim();
          setSearchDraft(null);
          updateQueryParams({ search: trimmed });
        }}
        onClearSearch={() => {
          setSearchDraft(null);
          updateQueryParams({ search: "" });
        }}
        totalResults={pagination.total}
        loading={loading}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Desktop Filter Sidebar (3 cols) */}
          <div className="hidden lg:block lg:col-span-3">
            <ProductFilterSidebar {...sidebarProps} />
          </div>

          {/* Main Product Catalog Column (9 cols) */}
          <div className="lg:col-span-9 min-w-0">
            {/* Toolbar: Mobile Filter Trigger + Result Count + Sort Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-[#c0c9bb]/60 text-[13px] font-bold text-[#00450d] hover:bg-[#f2f4f2] transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Bộ lọc</span>
                  {activeFilterCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#00450d] text-white text-[11px] tabular-nums leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <p className="text-[13.5px] text-[#5a6357] tabular-nums">
                  {loading ? (
                    "Đang cập nhật kết quả..."
                  ) : (
                    <>
                      Tìm thấy{" "}
                      <strong className="text-[#191c1b]">{pagination.total}</strong>{" "}
                      nông sản phù hợp
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline text-[12.5px] font-semibold text-[#5a6357] shrink-0">
                  Sắp xếp:
                </span>
                <CatalogSortDropdown
                  value={filters.sort}
                  onChange={(sortValue) =>
                    updateQueryParams({
                      sort: sortValue === "featured" ? "" : sortValue,
                    })
                  }
                />
              </div>
            </div>

            {/* Active Filter Chips */}
            <CatalogActiveFilterPills
              filters={filters}
              activeCategoryObj={activeCategoryObj}
              onRemoveSearch={() => {
                setSearchDraft(null);
                updateQueryParams({ search: "" });
              }}
              onRemoveCategory={() => updateQueryParams({ category: "" })}
              onRemovePrice={() =>
                updateQueryParams({ min_price: "", max_price: "" })
              }
              onRemoveCert={handleToggleCertification}
              onRemoveInStock={() => updateQueryParams({ in_stock: false })}
              onRemoveFlashSale={() => updateQueryParams({ flash_sale: false })}
              onResetAll={handleResetFilters}
            />

            {/* Product Cards Grid & Pagination */}
            <CatalogProductGrid
              products={products}
              loading={loading}
              errorMessage={errorMessage}
              pagination={pagination}
              onRetry={handleRetry}
              onResetFilters={handleResetFilters}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer */}
      <CatalogMobileFilterDrawer
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        sidebarProps={sidebarProps}
      />
    </div>
  );
}
