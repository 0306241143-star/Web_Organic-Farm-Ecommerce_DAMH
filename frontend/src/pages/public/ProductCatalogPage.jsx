/* Trang danh sách nông sản: tối ưu mobile (sticky top bar + lưới 2 cột) và desktop (cố định trên, cuộn lưới 4x4 dưới). */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Leaf,
  RefreshCw,
  Search,
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
  { value: "best_selling", label: "Bán chạy nhất" },
  { value: "newest", label: "Mới cập nhật nhất" },
  { value: "price_asc", label: "Giá: Thấp đến Cao" },
  { value: "price_desc", label: "Giá: Cao đến Thấp" },
  { value: "name_asc", label: "Tên sản phẩm: A → Z" },
  { value: "stock_desc", label: "Còn hàng nhiều nhất" },
];

// 4 cột x 4 hàng = 16 sản phẩm mỗi trang (8 hàng x 2 cột trên mobile)
const PER_PAGE = 16;

const normalizeVi = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

/* ================= HỘP CHỌN SẮP XẾP GỌN NHẸ (HỖ TRỢ MOBILE) ================= */
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
    <div ref={containerRef} className="relative shrink-0 sm:w-52">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Sắp xếp: ${selectedOption.label}`}
        className="h-9 px-2.5 sm:px-3 sm:w-full rounded-xl bg-white border border-[#c0c9bb]/70 hover:border-[#00450d]/50 text-[12px] sm:text-[12.5px] font-semibold text-[#191c1b] flex items-center justify-between gap-1.5 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#006e1c] shrink-0" />
          <span className="sm:hidden">Sắp xếp</span>
          <span className="hidden sm:inline truncate">{selectedOption.label}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#5a6357] shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Sắp xếp danh sách nông sản"
          className="absolute right-0 mt-1.5 w-56 overflow-hidden rounded-2xl bg-white border border-[#c0c9bb]/60 shadow-xl py-1 z-40"
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
                  className={`w-full px-3 py-2 text-left text-[12.5px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
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

/* ================= THANH THẺ BỘ LỌC ĐANG ÁP DỤNG ================= */
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
    <div className="flex flex-wrap items-center gap-1.5 pb-3">
      {pills.map((pill) => (
        <span
          key={pill.key}
          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-[#91f78e]/30 border border-[#006e1c]/25 text-[#00450d] text-[11px] sm:text-[11.5px] font-bold"
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
        className="px-2 py-0.5 rounded-full text-[11px] sm:text-[11.5px] font-bold text-[#5a6357] hover:text-[#00450d] hover:bg-white transition-colors cursor-pointer"
      >
        Xóa tất cả
      </button>
    </div>
  );
}

/* ================= LƯỚI SẢN PHẨM (2 CỘT MOBILE, 4 CỘT DESKTOP) ================= */
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
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
    <div className="space-y-5 sm:space-y-6 pb-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
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

/* ================= THÀNH PHẦN CHÍNH: TRANG DANH MỤC NÔNG SẢN ================= */
export default function ProductCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const listScrollRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [facets, setFacets] = useState({
    available_certifications: [],
    price_bounds: { min: 0, max: 0 },
    summary: { total_products: 0, in_stock_count: 0, flash_sale_count: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

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

      setErrorMessage("");
      setSearchParams(next, { replace: false });
    },
    [searchParams, setSearchParams]
  );

  // Debounce từ khóa tìm kiếm 350ms
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

  // Tải danh sách danh mục
  useEffect(() => {
    let active = true;
    publicApi
      .getCategories()
      .then((res) => {
        if (active && Array.isArray(res?.data)) {
          setCategories(res.data);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Tải danh sách sản phẩm
  useEffect(() => {
    let active = true;
    publicApi
      .getProducts({ per_page: 48 })
      .then((res) => {
        if (!active) return;
        setAllProducts(Array.isArray(res?.data) ? res.data : []);
        if (res?.meta?.facets) {
          setFacets(res.meta.facets);
        }
        setErrorMessage("");
      })
      .catch((err) => {
        if (active) {
          setErrorMessage(
            err?.message || "Không thể tải danh sách nông sản. Vui lòng thử lại."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadTick]);

  const { products, pagination } = useMemo(() => {
    let list = [...allProducts];

    if (filters.category) {
      list = list.filter(
        (item) => String(item.category?.id) === String(filters.category)
      );
    }

    if (filters.search) {
      const keyword = normalizeVi(filters.search);
      list = list.filter((item) => {
        const certificationDetails = (item.certifications || [])
          .map((certification) => `${certification.name || ""} ${certification.issuer || ""}`)
          .join(" ");
        const searchableText = [
          item.name,
          item.description,
          item.category?.name,
          item.farm?.name,
          item.unit,
          (item.certification_standards || []).join(" "),
          certificationDetails,
        ].join(" ");

        return normalizeVi(searchableText).includes(keyword);
      });
    }

    if (filters.minPrice !== "") {
      const minPrice = Number(filters.minPrice);
      if (Number.isFinite(minPrice)) {
        list = list.filter(
          (item) => Number(item.effective_price) >= Math.max(0, minPrice)
        );
      }
    }

    if (filters.maxPrice !== "") {
      const maxPrice = Number(filters.maxPrice);
      if (Number.isFinite(maxPrice)) {
        list = list.filter(
          (item) => Number(item.effective_price) <= Math.max(0, maxPrice)
        );
      }
    }

    if (filters.certifications.length > 0) {
      const wantedCertifications = filters.certifications.map(normalizeVi);
      list = list.filter((item) => {
        const certifications = [
          ...(item.certification_standards || []),
          ...(item.certifications || []).map(
            (certification) => `${certification.name || ""} ${certification.issuer || ""}`
          ),
        ].map(normalizeVi);

        return wantedCertifications.some((wanted) =>
          certifications.some((certification) => certification.includes(wanted))
        );
      });
    }

    if (filters.inStock) {
      list = list.filter((item) => item.in_stock === true);
    }
    if (filters.flashSale) {
      list = list.filter((item) => item.is_flash_sale === true);
    }

    if (filters.sort === "best_selling") {
      list.sort(
        (a, b) =>
          Number(b.sold_count || 0) - Number(a.sold_count || 0) ||
          Number(b.id) - Number(a.id)
      );
    } else if (filters.sort === "price_asc") {
      list.sort(
        (a, b) =>
          Number(a.effective_price) - Number(b.effective_price) ||
          Number(b.id) - Number(a.id)
      );
    } else if (filters.sort === "price_desc") {
      list.sort(
        (a, b) =>
          Number(b.effective_price) - Number(a.effective_price) ||
          Number(b.id) - Number(a.id)
      );
    } else if (filters.sort === "name_asc") {
      list.sort((a, b) =>
        normalizeVi(a.name).localeCompare(normalizeVi(b.name))
      );
    } else if (filters.sort === "newest") {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    } else if (filters.sort === "stock_desc") {
      list.sort(
        (a, b) =>
          Number(b.available_stock) - Number(a.available_stock) ||
          Number(b.id) - Number(a.id)
      );
    }

    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const currentPage = Math.min(
      Math.max(1, Math.floor(filters.page)),
      lastPage
    );

    return {
      products: list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE),
      pagination: {
        current_page: currentPage,
        per_page: PER_PAGE,
        total,
        last_page: lastPage,
      },
    };
  }, [allProducts, filters]);

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
    setErrorMessage("");
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const handlePageChange = useCallback(
    (nextPage) => {
      updateQueryParams(
        { page: nextPage > 1 ? nextPage : "" },
        { resetPage: false }
      );
      if (listScrollRef.current) {
        listScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateQueryParams]
  );

  return (
    <div className="bg-[#f6f8f6] min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)] flex flex-col lg:overflow-hidden">
      {/* 1. KHỐI TIÊU ĐỀ + TÌM KIẾM + BỘ LỌC CỐ ĐỊNH KHÔNG CUỘN */}
      <section className="sticky top-20 lg:static shrink-0 bg-white/95 backdrop-blur-md border-b border-[#c0c9bb]/40 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 space-y-2">
          {/* Hàng 1: Tiêu đề + Badge số lượng + Ô tìm kiếm + Sắp xếp */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center justify-between md:justify-start gap-2 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#91f78e]/30 border border-[#006e1c]/20 text-[#00450d] flex items-center justify-center shrink-0">
                  <Leaf className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <h1
                  className="text-[17px] sm:text-[22px] font-extrabold text-[#00450d] tracking-tight truncate"
                  style={{ fontFamily: "var(--font-headline)" }}
                >
                  {activeCategoryObj ? activeCategoryObj.name : "Danh mục nông sản sạch"}
                </h1>
              </div>

              <Badge variant="success" size="sm" className="tabular-nums shrink-0">
                {loading ? "..." : `${pagination.total} SP`}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto">
              {/* Ô tìm kiếm gọn */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = searchInput.trim();
                  setSearchDraft(null);
                  updateQueryParams({ search: trimmed });
                }}
                className="flex-1 min-w-0 md:w-72 lg:w-80 flex items-center gap-1 bg-[#f8faf8] p-1 rounded-xl border border-[#c0c9bb]/70 focus-within:border-[#00450d] focus-within:bg-white transition-all"
              >
                <div className="relative flex-1 flex items-center min-w-0">
                  <Search
                    className="w-3.5 h-3.5 text-[#5a6357] absolute left-2.5 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Tìm tên nông sản, chứng nhận..."
                    aria-label="Nhập từ khóa tìm kiếm nông sản"
                    className="w-full pl-8 pr-6 py-1 text-[12.5px] text-[#191c1b] placeholder:text-[#5a6357] bg-transparent outline-none"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchDraft(null);
                        updateQueryParams({ search: "" });
                      }}
                      aria-label="Xóa từ khóa tìm kiếm"
                      className="absolute right-1 p-0.5 rounded-md text-[#5a6357] hover:text-[#191c1b] hover:bg-[#e6e9e7] transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <Button type="submit" variant="primary" size="xs" className="shrink-0">
                  Tìm
                </Button>
              </form>

              {/* Hộp chọn sắp xếp */}
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

          {/* Hàng 2: Thanh bộ lọc ngang 1 dòng cuộn mượt trên mobile */}
          <ProductFilterSidebar
            categories={categories}
            facets={facets}
            filters={filters}
            activeFilterCount={activeFilterCount}
            onSelectCategory={(catId) => updateQueryParams({ category: catId })}
            onApplyPrice={(min, max) =>
              updateQueryParams({ min_price: min, max_price: max })
            }
            onToggleCert={handleToggleCertification}
            onToggleInStock={() => updateQueryParams({ in_stock: !filters.inStock })}
            onToggleFlashSale={() =>
              updateQueryParams({ flash_sale: !filters.flashSale })
            }
            onResetFilters={handleResetFilters}
          />
        </div>
      </section>

      {/* 2. VÙNG DANH SÁCH SẢN PHẨM (2 CỘT MOBILE, 4 CỘT x 4 HÀNG DESKTOP) */}
      <div
        ref={listScrollRef}
        className="flex-1 lg:overflow-y-auto scroll-smooth"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
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
  );
}