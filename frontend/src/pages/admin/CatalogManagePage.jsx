/* Admin catalog page orchestrating fixed header/filters and scrollable Page 1 (Products), Page 2 (Categories) & Page 3 (Subscription Packages). */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarCheck2,
  ExternalLink,
  PackageSearch,
  FolderTree,
  Plus,
  RefreshCw,
  Search,
  Sprout,
  X,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import AdminProductListTab from "../../components/admin/catalog/AdminProductListTab";
import ProductFormModal from "../../components/admin/catalog/ProductFormModal";
import AdminCategoryListTab from "../../components/admin/catalog/AdminCategoryListTab";
import CategoryFormModal from "../../components/admin/catalog/CategoryFormModal";
import AdminSubscriptionListTab from "../../components/admin/catalog/AdminSubscriptionListTab";
import SubscriptionPackageFormModal from "../../components/admin/catalog/SubscriptionPackageFormModal";
import CategoryDropdown from "../../components/admin/catalog/CategoryDropdown";

export default function CatalogManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activePage =
    tabParam === "categories"
      ? "categories"
      : tabParam === "subscriptions"
        ? "subscriptions"
        : "products";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bộ lọc Page 1 (Sản phẩm)
  const [prodCategoryFilter, setProdCategoryFilter] = useState("ALL");
  const [prodStatusFilter, setProdStatusFilter] = useState("ALL");
  const [prodSearch, setProdSearch] = useState("");

  // Bộ lọc Page 2 (Danh mục)
  const [catStatusFilter, setCatStatusFilter] = useState("ALL");
  const [catSearch, setCatSearch] = useState("");

  // Bộ lọc Page 3 (Gói định kỳ)
  const [subStatusFilter, setSubStatusFilter] = useState("ALL");
  const [subSearch, setSubSearch] = useState("");

  // Modal & Action states cho Sản phẩm
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [togglingProdId, setTogglingProdId] = useState(null);

  // Modal & Action states cho Danh mục
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [togglingCatId, setTogglingCatId] = useState(null);

  // Modal & Action states cho Gói định kỳ
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [togglingSubId, setTogglingSubId] = useState(null);

  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [catResult, prodResult, subResult] = await Promise.allSettled([
      adminApi.getCategories(),
      adminApi.getProducts(),
      adminApi.getSubscriptions(),
    ]);

    if (catResult.status === "fulfilled") {
      const catList = catResult.value?.data?.data ?? catResult.value?.data ?? [];
      setCategories(Array.isArray(catList) ? catList : []);
    }

    if (prodResult.status === "fulfilled") {
      const prodList = prodResult.value?.data?.data ?? prodResult.value?.data ?? [];
      setProducts(Array.isArray(prodList) ? prodList : []);
    }

    if (subResult.status === "fulfilled") {
      const subList = subResult.value?.data?.data ?? subResult.value?.data ?? [];
      setSubscriptions(Array.isArray(subList) ? subList : []);
    }

    if (
      catResult.status === "rejected" ||
      prodResult.status === "rejected" ||
      subResult.status === "rejected"
    ) {
      const errObj =
        prodResult.status === "rejected"
          ? prodResult.reason
          : catResult.status === "rejected"
            ? catResult.reason
            : subResult.reason;
      const detailMsg =
        errObj?.response?.data?.message ||
        errObj?.message ||
        "Không thể tải đầy đủ dữ liệu quản trị.";
      showGlobalToast(detailMsg, "error");
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  const switchSubPage = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "categories" || tab === "subscriptions") next.set("tab", tab);
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  /* --- Lọc dữ liệu Sản phẩm (Page 1) --- */
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (
        prodCategoryFilter !== "ALL" &&
        String(p.category_id) !== String(prodCategoryFilter)
      ) {
        return false;
      }
      if (prodStatusFilter !== "ALL" && p.status !== prodStatusFilter) {
        return false;
      }
      if (prodSearch.trim()) {
        const kw = prodSearch.trim().toLowerCase();
        const match =
          (p.name || "").toLowerCase().includes(kw) ||
          (p.category_name || "").toLowerCase().includes(kw) ||
          (p.unit || "").toLowerCase().includes(kw) ||
          String(p.id) === kw;
        if (!match) return false;
      }
      return true;
    });
  }, [products, prodCategoryFilter, prodStatusFilter, prodSearch]);

  /* --- Lọc dữ liệu Danh mục (Page 2) --- */
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (catStatusFilter !== "ALL" && c.status !== catStatusFilter) {
        return false;
      }
      if (catSearch.trim()) {
        const kw = catSearch.trim().toLowerCase();
        const match =
          (c.name || "").toLowerCase().includes(kw) ||
          (c.description || "").toLowerCase().includes(kw);
        if (!match) return false;
      }
      return true;
    });
  }, [categories, catStatusFilter, catSearch]);

  /* --- Lọc dữ liệu Gói định kỳ (Page 3) --- */
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((pkg) => {
      if (subStatusFilter !== "ALL" && pkg.status !== subStatusFilter) {
        return false;
      }
      if (subSearch.trim()) {
        const kw = subSearch.trim().toLowerCase();
        const matchName = (pkg.name || "").toLowerCase().includes(kw);
        const matchDesc = (pkg.description || "").toLowerCase().includes(kw);
        const matchItems = (pkg.items || []).some((item) =>
          (item.product_name || "").toLowerCase().includes(kw)
        );
        if (!matchName && !matchDesc && !matchItems) return false;
      }
      return true;
    });
  }, [subscriptions, subStatusFilter, subSearch]);

  /* --- Handlers cho Sản phẩm (Page 1) --- */
  const handleProductSaved = (savedItem, isEdit) => {
    if (!savedItem?.id) return;
    if (isEdit) {
      setProducts((prev) => prev.map((p) => (p.id === savedItem.id ? savedItem : p)));
    } else {
      setProducts((prev) => [savedItem, ...prev]);
      setCategories((prev) =>
        prev.map((c) =>
          String(c.id) === String(savedItem.category_id)
            ? {
              ...c,
              total_products_count: (c.total_products_count || 0) + 1,
              active_products_count:
                savedItem.status === "Dang_ban"
                  ? (c.active_products_count || 0) + 1
                  : c.active_products_count || 0,
            }
            : c
        )
      );
    }
  };

  const handleToggleProductStatus = async (product) => {
    const nextStatus = product.status === "Dang_ban" ? "Tam_ngung" : "Dang_ban";
    setTogglingProdId(product.id);
    try {
      const res = await adminApi.updateProductStatus(product.id, nextStatus);
      const updated = res.data?.data ?? res.data;
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? updated || {
              ...p,
              status: nextStatus,
              status_label: nextStatus === "Dang_ban" ? "Đang mở bán" : "Tạm ngưng",
            }
            : p
        )
      );
      showGlobalToast(
        nextStatus === "Dang_ban"
          ? `Đã mở bán lại "${product.name}".`
          : `Đã tạm ngưng bán "${product.name}".`
      );
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message || "Không thể đổi trạng thái sản phẩm.",
        "error"
      );
    } finally {
      setTogglingProdId(null);
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa sản phẩm nông sản?",
      message: `Bạn có chắc chắn muốn xóa "${product.name}" khỏi hệ thống? Nếu sản phẩm đã có lô thu hoạch hoặc đơn hàng, hệ thống sẽ từ chối xóa để bảo toàn dữ liệu.`,
      confirmLabel: "Xóa Sản Phẩm",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setCategories((prev) =>
        prev.map((c) =>
          String(c.id) === String(product.category_id)
            ? {
              ...c,
              total_products_count: Math.max(0, (c.total_products_count || 1) - 1),
              active_products_count:
                product.status === "Dang_ban"
                  ? Math.max(0, (c.active_products_count || 1) - 1)
                  : c.active_products_count || 0,
            }
            : c
        )
      );
      showGlobalToast(`Đã xóa sản phẩm "${product.name}".`);
    } catch (err) {
      showGlobalToast(
        err?.message || err?.response?.data?.message || "Không thể xóa sản phẩm này.",
        "error"
      );
    }
  };

  /* --- Handlers cho Danh mục (Page 2) --- */
  const handleCategorySaved = (savedCat, isEdit) => {
    if (!savedCat?.id) return;
    if (isEdit) {
      setCategories((prev) => prev.map((c) => (c.id === savedCat.id ? savedCat : c)));
      setProducts((prev) =>
        prev.map((p) =>
          String(p.category_id) === String(savedCat.id)
            ? { ...p, category_name: savedCat.name }
            : p
        )
      );
    } else {
      setCategories((prev) => [...prev, savedCat]);
    }
  };

  const handleToggleCategoryStatus = async (cat) => {
    const nextStatus = cat.status === "Hoat_dong" ? "Tam_an" : "Hoat_dong";
    setTogglingCatId(cat.id);
    try {
      const res = await adminApi.updateCategoryStatus(cat.id, nextStatus);
      const updated = res.data?.data ?? res.data;
      setCategories((prev) =>
        prev.map((c) =>
          c.id === cat.id
            ? updated || {
              ...c,
              status: nextStatus,
              status_label: nextStatus === "Hoat_dong" ? "Hoạt động" : "Tạm ẩn",
            }
            : c
        )
      );
      showGlobalToast(
        nextStatus === "Hoat_dong"
          ? `Đã kích hoạt hiển thị danh mục "${cat.name}".`
          : `Đã tạm ẩn danh mục "${cat.name}".`
      );
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message || "Không thể cập nhật trạng thái danh mục.",
        "error"
      );
    } finally {
      setTogglingCatId(null);
    }
  };

  const handleDeleteCategory = async (cat) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa danh mục nông sản?",
      message: `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"? Chỉ có thể xóa các danh mục chưa chứa sản phẩm nào.`,
      confirmLabel: "Xóa Danh Mục",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showGlobalToast(`Đã xóa danh mục "${cat.name}".`);
    } catch (err) {
      showGlobalToast(
        err?.message || err?.response?.data?.message || "Không thể xóa danh mục này.",
        "error"
      );
    }
  };

  /* --- Handlers cho Gói định kỳ (Page 3) --- */
  const handleSubscriptionSaved = (savedPkg, isEdit) => {
    if (!savedPkg?.id) return;
    if (isEdit) {
      setSubscriptions((prev) =>
        prev.map((pkg) => (pkg.id === savedPkg.id ? savedPkg : pkg))
      );
    } else {
      setSubscriptions((prev) => [savedPkg, ...prev]);
    }
  };

  const handleToggleSubscriptionStatus = async (pkg) => {
    const nextStatus = pkg.status === "Dang_mo" ? "Tam_dung" : "Dang_mo";
    setTogglingSubId(pkg.id);
    try {
      const res = await adminApi.updateSubscriptionStatus(pkg.id, nextStatus);
      const updated = res.data?.data ?? res.data;
      setSubscriptions((prev) =>
        prev.map((item) =>
          item.id === pkg.id
            ? updated || {
              ...item,
              status: nextStatus,
              status_label: nextStatus === "Dang_mo" ? "Đang mở bán" : "Tạm dừng",
            }
            : item
        )
      );
      showGlobalToast(
        nextStatus === "Dang_mo"
          ? `Đã mở bán gói "${pkg.name}".`
          : `Đã tạm dừng gói "${pkg.name}".`
      );
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message || "Không thể đổi trạng thái gói định kỳ.",
        "error"
      );
    } finally {
      setTogglingSubId(null);
    }
  };

  const handleDeleteSubscription = async (pkg) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa gói rau định kỳ?",
      message: `Bạn có chắc chắn muốn xóa gói "${pkg.name}"? Nếu gói đã có khách hàng đăng ký, hệ thống sẽ từ chối xóa.`,
      confirmLabel: "Xóa Gói",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await adminApi.deleteSubscription(pkg.id);
      setSubscriptions((prev) => prev.filter((item) => item.id !== pkg.id));
      showGlobalToast(`Đã xóa gói "${pkg.name}".`);
    } catch (err) {
      showGlobalToast(
        err?.message || err?.response?.data?.message || "Không thể xóa gói này.",
        "error"
      );
    }
  };

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI CỐ ĐỊNH SÁT MÉP TRÊN: Tiêu đề + Nút thêm + Page 1/2/3 + Bộ lọc */}
      <div className="shrink-0 z-20 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 pb-3 space-y-3">
          {/* Hàng 1: Tiêu đề + Nút làm mới & Nút thêm mới */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider">
                <Sprout className="w-3.5 h-3.5 shrink-0" />
                <span>Quản Trị Danh Mục, Mặt Hàng & Gói Định Kỳ</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                {activePage === "products"
                  ? "Quản Lý Danh Sách Nông Sản"
                  : activePage === "categories"
                    ? "Quản Lý Danh Mục Nông Sản"
                    : "Quản Lý Gói Rau Định Kỳ"}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchAllData(true)}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Làm mới dữ liệu"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>

              {activePage === "products" ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProdModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Sản Phẩm Mới</span>
                </button>
              ) : activePage === "categories" ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategory(null);
                    setIsCatModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Danh Mục Mới</span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubscription(null);
                      setIsSubModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Gói Định Kỳ Mới</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Hàng 2: Thanh chuyển Page 1 / Page 2 / Page 3 + Bộ lọc gộp chung */}
          {/* Hàng 2: Thanh chuyển Page 1 / Page 2 / Page 3 */}
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => switchSubPage("products")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${activePage === "products"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              <PackageSearch className="w-3.5 h-3.5" />
              <span>Page 1: Sản Phẩm</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-extrabold tabular-nums ${activePage === "products"
                    ? "bg-white/25 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                  }`}
              >
                {products.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchSubPage("categories")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${activePage === "categories"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Page 2: Danh Mục</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-extrabold tabular-nums ${activePage === "categories"
                    ? "bg-white/25 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                  }`}
              >
                {categories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchSubPage("subscriptions")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${activePage === "subscriptions"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              <CalendarCheck2 className="w-3.5 h-3.5" />
              <span>Page 3: Gói Định Kỳ</span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-full font-extrabold tabular-nums ${activePage === "subscriptions"
                    ? "bg-white/25 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                  }`}
              >
                {subscriptions.length}
              </span>
            </button>
          </div>

          {/* Hàng 3: Thanh bộ lọc nằm ngay dưới hàng Page */}
          <div className="pt-2.5 border-t border-slate-100">
            {activePage === "products" ? (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                {/* Lọc trạng thái bên trái */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0 shrink-0">
                  {[
                    { id: "ALL", label: "Tất cả", count: products.length },
                    {
                      id: "Dang_ban",
                      label: "Đang mở bán",
                      count: products.filter((p) => p.status === "Dang_ban").length,
                    },
                    {
                      id: "Tam_ngung",
                      label: "Tạm ngưng",
                      count: products.filter((p) => p.status === "Tam_ngung").length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setProdStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${prodStatusFilter === tab.id
                          ? "bg-[#064e2e] text-white shadow-2xs"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 rounded-full tabular-nums ${prodStatusFilter === tab.id
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-600"
                          }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Lọc danh mục + Tìm kiếm nằm gọn bên phải */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:flex-1 lg:justify-end">
                  <div className="w-full sm:w-52 shrink-0">
                    <CategoryDropdown
                      categories={categories}
                      value={prodCategoryFilter}
                      onChange={setProdCategoryFilter}
                      placeholder="Tất cả danh mục"
                    />
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={prodSearch}
                      onChange={(e) => setProdSearch(e.target.value)}
                      placeholder="Tìm tên nông sản, đơn vị..."
                      className="w-full pl-8 pr-7 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {prodSearch && (
                      <button
                        type="button"
                        onClick={() => setProdSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : activePage === "categories" ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                      onClick={() => setCatStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${catStatusFilter === tab.id
                          ? "bg-[#064e2e] text-white shadow-2xs"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 rounded-full tabular-nums ${catStatusFilter === tab.id
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-600"
                          }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                    placeholder="Tìm tên danh mục, mô tả..."
                    className="w-full pl-8 pr-7 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {catSearch && (
                    <button
                      type="button"
                      onClick={() => setCatSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  {[
                    { id: "ALL", label: "Tất cả", count: subscriptions.length },
                    {
                      id: "Dang_mo",
                      label: "Đang mở bán",
                      count: subscriptions.filter((p) => p.status === "Dang_mo").length,
                    },
                    {
                      id: "Tam_dung",
                      label: "Tạm dừng",
                      count: subscriptions.filter((p) => p.status === "Tam_dung").length,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${subStatusFilter === tab.id
                          ? "bg-[#064e2e] text-white shadow-2xs"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 rounded-full tabular-nums ${subStatusFilter === tab.id
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-600"
                          }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    placeholder="Tìm tên gói hoặc nông sản trong gói..."
                    className="w-full pl-8 pr-7 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {subSearch && (
                    <button
                      type="button"
                      onClick={() => setSubSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VÙNG DANH SÁCH CUỘN ĐỘC LẬP BÊN DƯỚI */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-4 flex flex-col">
        {activePage === "products" ? (
          <AdminProductListTab
            products={filteredProducts}
            loading={loading}
            togglingProdId={togglingProdId}
            onEditProduct={(prod) => {
              setEditingProduct(prod);
              setIsProdModalOpen(true);
            }}
            onToggleStatus={handleToggleProductStatus}
            onDeleteProduct={handleDeleteProduct}
          />
        ) : activePage === "categories" ? (
          <AdminCategoryListTab
            categories={filteredCategories}
            loading={loading}
            togglingCatId={togglingCatId}
            onSelectCategoryProducts={(catId) => {
              setProdCategoryFilter(catId);
              switchSubPage("products");
            }}
            onEditCategory={(cat) => {
              setEditingCategory(cat);
              setIsCatModalOpen(true);
            }}
            onToggleStatus={handleToggleCategoryStatus}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : (
          <AdminSubscriptionListTab
            packages={filteredSubscriptions}
            loading={loading}
            togglingSubId={togglingSubId}
            onEditPackage={(pkg) => {
              setEditingSubscription(pkg);
              setIsSubModalOpen(true);
            }}
            onToggleStatus={handleToggleSubscriptionStatus}
            onDeletePackage={handleDeleteSubscription}
          />
        )}
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isProdModalOpen}
        onClose={() => setIsProdModalOpen(false)}
        editingProduct={editingProduct}
        categories={categories}
        onSaved={handleProductSaved}
      />

      <CategoryFormModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        editingCategory={editingCategory}
        onSaved={handleCategorySaved}
      />

      <SubscriptionPackageFormModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        editingPackage={editingSubscription}
        products={products}
        onSaved={handleSubscriptionSaved}
      />
    </div>
  );
}