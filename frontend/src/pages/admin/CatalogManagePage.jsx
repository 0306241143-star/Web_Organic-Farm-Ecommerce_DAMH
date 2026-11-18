/* Admin catalog page orchestrating Page 1 (Products) and Page 2 (Categories). */
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  PackageSearch,
  FolderTree,
  Plus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import AdminProductListTab from "../../components/admin/catalog/AdminProductListTab";
import ProductFormModal from "../../components/admin/catalog/ProductFormModal";
import AdminCategoryListTab from "../../components/admin/catalog/AdminCategoryListTab";
import CategoryFormModal from "../../components/admin/catalog/CategoryFormModal";

export default function CatalogManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activePage = searchParams.get("tab") === "categories" ? "categories" : "products";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter liên kết từ Page 2 -> Page 1
  const [prodCategoryFilter, setProdCategoryFilter] = useState("ALL");

  // Modal & Action states cho Sản phẩm
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [togglingProdId, setTogglingProdId] = useState(null);

  // Modal & Action states cho Danh mục
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [togglingCatId, setTogglingCatId] = useState(null);

const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [catResult, prodResult] = await Promise.allSettled([
      adminApi.getCategories(),
      adminApi.getProducts(),
    ]);

    if (catResult.status === "fulfilled") {
      const catList = catResult.value?.data?.data ?? catResult.value?.data ?? [];
      setCategories(Array.isArray(catList) ? catList : []);
    }

    if (prodResult.status === "fulfilled") {
      const prodList = prodResult.value?.data?.data ?? prodResult.value?.data ?? [];
      setProducts(Array.isArray(prodList) ? prodList : []);
    }

    if (catResult.status === "rejected" || prodResult.status === "rejected") {
      const errObj =
        prodResult.status === "rejected" ? prodResult.reason : catResult.reason;
      const detailMsg =
        errObj?.response?.data?.message ||
        errObj?.message ||
        "Không thể tải dữ liệu danh mục & sản phẩm.";
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
    if (tab === "categories") next.set("tab", "categories");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

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
      showGlobalToast(err?.response?.data?.message || "Không thể đổi trạng thái sản phẩm.", "error");
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
      showGlobalToast(err?.message || err?.response?.data?.message || "Không thể xóa sản phẩm này.", "error");
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
      showGlobalToast(err?.response?.data?.message || "Không thể cập nhật trạng thái danh mục.", "error");
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
      showGlobalToast(err?.message || err?.response?.data?.message || "Không thể xóa danh mục này.", "error");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner + Chuyển đổi 2 Page */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <Sprout className="w-4 h-4" />
              <span>Quản Trị Danh Mục & Mặt Hàng</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {activePage === "products"
                ? "Quản Lý Danh Sách Nông Sản"
                : "Quản Lý Danh Mục Nông Sản"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {activePage === "products"
                ? "Thêm mới nông sản, cập nhật giá bán niêm yết, hình ảnh đại diện, tỷ lệ tích điểm và trạng thái mở bán trên cửa hàng."
                : "Tổ chức phân nhóm danh mục nông sản, cập nhật mô tả và kiểm soát trạng thái hiển thị của từng nhóm hàng."}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchAllData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            {activePage === "products" ? (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setIsProdModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/15 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Sản Phẩm Mới</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setIsCatModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-950/15 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Danh Mục Mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Thanh chuyển đổi 2 Page */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => switchSubPage("products")}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activePage === "products"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <PackageSearch className="w-4 h-4" />
            <span>Page 1: Quản Lý Sản Phẩm</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold tabular-nums ${
                activePage === "products"
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
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activePage === "categories"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Page 2: Quản Lý Danh Mục</span>
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold tabular-nums ${
                activePage === "categories"
                  ? "bg-white/25 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              {categories.length}
            </span>
          </button>
        </div>
      </div>

      {/* Nội dung từng Page */}
      {activePage === "products" ? (
        <AdminProductListTab
          products={products}
          categories={categories}
          loading={loading}
          selectedCategoryFilter={prodCategoryFilter}
          onCategoryFilterChange={setProdCategoryFilter}
          togglingProdId={togglingProdId}
          onEditProduct={(prod) => {
            setEditingProduct(prod);
            setIsProdModalOpen(true);
          }}
          onToggleStatus={handleToggleProductStatus}
          onDeleteProduct={handleDeleteProduct}
        />
      ) : (
        <AdminCategoryListTab
          categories={categories}
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
      )}

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
    </div>
  );
}