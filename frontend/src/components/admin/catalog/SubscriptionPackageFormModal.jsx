/* Modal thêm mới và chỉnh sửa Gói rau định kỳ: chọn sản phẩm từ danh sách, nhân số lần giao và tính % giảm giá. */
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarCheck2,
  Check,
  Loader2,
  Percent,
  Plus,
  Search,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";
import { formatCurrencyVnd } from "../../../services/publicApi";

function getProductUnitPrice(product) {
  return Number(product?.price ?? product?.Gia_niem_yet ?? product?.unit_price ?? 0);
}

export default function SubscriptionPackageFormModal({
  isOpen = false,
  onClose,
  editingPackage = null,
  products = [],
  onSaved,
}) {
  const [form, setForm] = useState({
    Ten_goi: "",
    Mo_ta: "",
    Gia_goi: "0",
    Ky_han_thang: "1",
    Khoi_luong_moi_lan: "3",
    Trang_thai: "Dang_mo",
    items: [],
  });
  const [deliveryCount, setDeliveryCount] = useState("4");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const calcSingleDeliveryPrice = (itemsList) => {
    const total = itemsList.reduce((sum, row) => {
      const prod = products.find((p) => String(p.id) === String(row.Ma_san_pham));
      const fallbackItem = (editingPackage?.items || []).find(
        (i) => String(i.product_id) === String(row.Ma_san_pham)
      );
      const unitPrice = prod
        ? getProductUnitPrice(prod)
        : Number(fallbackItem?.unit_price ?? 0);
      const qty = Math.max(0, Number(row.So_luong) || 0);
      return sum + unitPrice * qty;
    }, 0);
    return Math.round(total);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (editingPackage) {
      const mappedItems = (editingPackage.items || []).map((item) => ({
        Ma_san_pham: String(item.product_id),
        So_luong: String(item.quantity),
      }));

      const durationMonths = Math.max(1, Number(editingPackage.duration_months ?? 1));
      const defaultDeliveries = durationMonths * 4;
      const singlePrice = calcSingleDeliveryPrice(mappedItems);
      const currentPrice = Number(editingPackage.price ?? 0);

      // Suy luận số lần giao nếu gói cũ từng cấu hình khác 4 lần/tháng
      let inferredDeliveries = defaultDeliveries;
      if (singlePrice > 0 && currentPrice > 0) {
        const ratio = currentPrice / singlePrice;
        if (ratio > defaultDeliveries) {
          inferredDeliveries = Math.max(defaultDeliveries, Math.ceil(ratio));
        }
      }

      const fullOriginal = singlePrice * inferredDeliveries;
      let inferredDiscount = "0";
      if (fullOriginal > 0 && currentPrice > 0 && currentPrice <= fullOriginal) {
        const pct = ((fullOriginal - currentPrice) / fullOriginal) * 100;
        inferredDiscount = String(Math.round(pct * 100) / 100);
      }

      setForm({
        Ten_goi: editingPackage.name || "",
        Mo_ta: editingPackage.description || "",
        Gia_goi: String(editingPackage.price ?? ""),
        Ky_han_thang: String(durationMonths),
        Khoi_luong_moi_lan: String(editingPackage.weight_per_delivery ?? 3),
        Trang_thai: editingPackage.status || "Dang_mo",
        items: mappedItems,
      });
      setDeliveryCount(String(inferredDeliveries));
      setDiscountPercent(inferredDiscount);
      setIsPickerOpen(false);
    } else {
      setForm({
        Ten_goi: "",
        Mo_ta: "",
        Gia_goi: "0",
        Ky_han_thang: "1",
        Khoi_luong_moi_lan: "3",
        Trang_thai: "Dang_mo",
        items: [],
      });
      setDeliveryCount("4");
      setDiscountPercent("0");
      setIsPickerOpen(false);
    }

    setProductSearch("");
    setFormError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingPackage, products]);

  // Giá bán lẻ 1 lần giao
  const singleDeliveryPrice = useMemo(
    () => calcSingleDeliveryPrice(form.items),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.items, products, editingPackage]
  );

  const safeDeliveryCount = Math.max(1, Math.floor(Number(deliveryCount) || 1));

  // Tổng giá gốc cả gói = Giá 1 lần giao * Tổng số lần giao
  const totalOriginalPrice = Math.round(singleDeliveryPrice * safeDeliveryCount);

  const recalculateFinalPrice = (nextItems, nextDeliveriesStr, nextDiscountStr) => {
    const unitDeliveryTotal = calcSingleDeliveryPrice(nextItems);
    const deliveries = Math.max(1, Math.floor(Number(nextDeliveriesStr) || 1));
    const fullOriginal = unitDeliveryTotal * deliveries;
    const pct = Math.min(100, Math.max(0, Number(nextDiscountStr) || 0));
    return String(Math.max(0, Math.round(fullOriginal * (1 - pct / 100))));
  };

  const selectedProductIds = useMemo(
    () => new Set(form.items.map((item) => String(item.Ma_san_pham))),
    [form.items]
  );

  const filteredProducts = useMemo(() => {
    const kw = productSearch.trim().toLowerCase();
    return products.filter((prod) => {
      if (!kw) return true;
      return (
        (prod.name || "").toLowerCase().includes(kw) ||
        (prod.category_name || "").toLowerCase().includes(kw)
      );
    });
  }, [products, productSearch]);

  if (!isOpen) return null;

  const handleToggleSelectProduct = (product) => {
    const prodId = String(product.id);
    const exists = selectedProductIds.has(prodId);

    const nextItems = exists
      ? form.items.filter((row) => String(row.Ma_san_pham) !== prodId)
      : [...form.items, { Ma_san_pham: prodId, So_luong: "1" }];

    setForm((prev) => ({
      ...prev,
      items: nextItems,
      Gia_goi: recalculateFinalPrice(nextItems, deliveryCount, discountPercent),
    }));
  };

  const handleQuantityChange = (index, value) => {
    const nextItems = form.items.map((row, idx) =>
      idx === index ? { ...row, So_luong: value } : row
    );
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      Gia_goi: recalculateFinalPrice(nextItems, deliveryCount, discountPercent),
    }));
  };

  const handleRemoveItemRow = (index) => {
    const nextItems = form.items.filter((_, idx) => idx !== index);
    setForm((prev) => ({
      ...prev,
      items: nextItems,
      Gia_goi: recalculateFinalPrice(nextItems, deliveryCount, discountPercent),
    }));
  };

  const handleDurationChange = (rawMonths) => {
    const months = Math.max(1, Math.floor(Number(rawMonths) || 1));
    const autoDeliveries = String(months * 4);
    setDeliveryCount(autoDeliveries);
    setForm((prev) => ({
      ...prev,
      Ky_han_thang: rawMonths,
      Gia_goi: recalculateFinalPrice(prev.items, autoDeliveries, discountPercent),
    }));
  };

  const handleDeliveryCountChange = (rawCount) => {
    setDeliveryCount(rawCount);
    setForm((prev) => ({
      ...prev,
      Gia_goi: recalculateFinalPrice(prev.items, rawCount, discountPercent),
    }));
  };

  const handleDiscountChange = (rawValue) => {
    if (rawValue === "") {
      setDiscountPercent("");
      setForm((prev) => ({
        ...prev,
        Gia_goi: String(totalOriginalPrice),
      }));
      return;
    }

    const clamped = Math.min(100, Math.max(0, Number(rawValue) || 0));
    setDiscountPercent(rawValue);
    setForm((prev) => ({
      ...prev,
      Gia_goi: recalculateFinalPrice(prev.items, deliveryCount, clamped),
    }));
  };

  const handleManualPriceChange = (rawPrice) => {
    const numericPrice = Math.max(0, Number(rawPrice) || 0);
    setForm((prev) => ({ ...prev, Gia_goi: rawPrice }));

    if (totalOriginalPrice > 0 && numericPrice <= totalOriginalPrice) {
      const pct = ((totalOriginalPrice - numericPrice) / totalOriginalPrice) * 100;
      setDiscountPercent(String(Math.round(pct * 100) / 100));
    } else if (numericPrice > totalOriginalPrice) {
      setDiscountPercent("0");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.Ten_goi.trim()) {
      setFormError("Vui lòng nhập tên gói rau định kỳ.");
      return;
    }
    if (form.items.length === 0) {
      setFormError("Vui lòng chọn ít nhất 1 nông sản cho gói định kỳ.");
      return;
    }
    if (Number(form.Gia_goi) < 1000) {
      setFormError("Tổng giá gói phải từ 1.000đ trở lên.");
      return;
    }

    const payload = {
      Ten_goi: form.Ten_goi.trim(),
      Mo_ta: form.Mo_ta.trim() || null,
      Gia_goi: Number(form.Gia_goi),
      Ky_han_thang: Number(form.Ky_han_thang),
      Khoi_luong_moi_lan: Number(form.Khoi_luong_moi_lan),
      Trang_thai: form.Trang_thai,
      items: form.items.map((row) => ({
        Ma_san_pham: Number(row.Ma_san_pham),
        So_luong: Number(row.So_luong),
      })),
    };

    setSubmitting(true);
    try {
      if (editingPackage) {
        const res = await adminApi.updateSubscription(editingPackage.id, payload);
        const updated = res.data?.data ?? res.data;
        showGlobalToast(`Đã cập nhật gói "${payload.Ten_goi}".`);
        onSaved(updated, true);
      } else {
        const res = await adminApi.createSubscription(payload);
        const created = res.data?.data ?? res.data;
        showGlobalToast(`Đã tạo mới gói "${payload.Ten_goi}".`);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      const fieldErrors = Object.values(
        err?.fieldErrors ?? err?.response?.data?.errors ?? {}
      ).flat();
      setFormError(
        fieldErrors[0] ||
          err?.message ||
          err?.response?.data?.message ||
          "Không thể lưu gói rau định kỳ."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const savedAmount = Math.max(0, totalOriginalPrice - (Number(form.Gia_goi) || 0));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingPackage ? "Chỉnh sửa gói định kỳ" : "Thêm gói định kỳ"}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] sm:max-h-[92vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064e2e] text-white flex items-center justify-center shrink-0">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800">
                {editingPackage ? "Chỉnh Sửa Gói Rau Định Kỳ" : "Thêm Gói Rau Định Kỳ Mới"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                Chọn danh sách nông sản, số lần giao và thiết lập ưu đãi giảm giá tự động
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng biểu mẫu"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="admin-subscription-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          {/* Tên gói */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên Gói Định Kỳ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.Ten_goi}
              onChange={(e) => setForm((prev) => ({ ...prev, Ten_goi: e.target.value }))}
              placeholder="Ví dụ: Gói Gia Đình 4 Người (Rau Củ Hữu Cơ)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Khu vực chọn & quản lý sản phẩm trong gói */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Nông Sản Trong Mỗi Lần Giao ({form.items.length} món){" "}
                  <span className="text-red-500">*</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  Giá trị 1 lần giao:{" "}
                  <strong className="text-[#064e2e]">
                    {formatCurrencyVnd(singleDeliveryPrice)}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsPickerOpen((prev) => !prev)}
                disabled={products.length === 0}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                  isPickerOpen
                    ? "bg-slate-800 text-white hover:bg-slate-700"
                    : "bg-[#064e2e] text-white hover:bg-[#043821]"
                }`}
              >
                {isPickerOpen ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Xong chọn sản phẩm</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm nông sản</span>
                  </>
                )}
              </button>
            </div>

            {/* Bảng danh sách sản phẩm mở ra khi bấm Thêm nông sản */}
            {isPickerOpen && (
              <div className="rounded-2xl bg-white border border-emerald-200 p-3.5 space-y-2.5 shadow-xs">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tìm nhanh tên rau củ, trái cây để chọn..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 pr-1">
                  {filteredProducts.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">
                      Không tìm thấy nông sản phù hợp.
                    </p>
                  ) : (
                    filteredProducts.map((prod) => {
                      const isSelected = selectedProductIds.has(String(prod.id));
                      const unitPrice = getProductUnitPrice(prod);

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleToggleSelectProduct(prod)}
                          className={`w-full py-2.5 px-2.5 text-left flex items-center justify-between gap-3 rounded-xl transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-emerald-50/90 text-emerald-950"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? "bg-[#064e2e] border-[#064e2e] text-white"
                                  : "bg-white border-slate-300"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-[13px] font-bold truncate">
                                {prod.name}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {prod.category_name || "Nông sản hữu cơ"} · ĐVT:{" "}
                                {prod.unit || "kg"}
                              </p>
                            </div>
                          </div>

                          <span className="text-xs font-extrabold text-[#064e2e] tabular-nums shrink-0">
                            {formatCurrencyVnd(unitPrice)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Danh sách các sản phẩm đã chọn */}
            {form.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-5 px-4 text-center space-y-1">
                <Sprout className="w-6 h-6 text-emerald-600/70 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Chưa có nông sản nào được chọn
                </p>
                <p className="text-[11px] text-slate-400">
                  Bấm nút &ldquo;+ Thêm nông sản&rdquo; phía trên để chọn từ danh sách.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {form.items.map((row, idx) => {
                  const selectedProd = products.find(
                    (p) => String(p.id) === String(row.Ma_san_pham)
                  );
                  const fallbackItem = (editingPackage?.items || []).find(
                    (i) => String(i.product_id) === String(row.Ma_san_pham)
                  );
                  const name =
                    selectedProd?.name ||
                    fallbackItem?.product_name ||
                    `Sản phẩm #${row.Ma_san_pham}`;
                  const unit = selectedProd?.unit || fallbackItem?.unit || "kg";
                  const unitPrice = selectedProd
                    ? getProductUnitPrice(selectedProd)
                    : Number(fallbackItem?.unit_price ?? 0);
                  const lineTotal = Math.round(unitPrice * (Number(row.So_luong) || 0));

                  return (
                    <div
                      key={row.Ma_san_pham}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 rounded-xl bg-white border border-slate-200/90 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                          {name}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          Đơn giá: {formatCurrencyVnd(unitPrice)} / {unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-emerald-600 focus-within:bg-white">
                          <input
                            type="number"
                            min={0.1}
                            max={100}
                            step="any"
                            required
                            aria-label={`Số lượng ${name}`}
                            value={row.So_luong}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className="w-16 px-2.5 py-1.5 text-xs sm:text-sm font-extrabold text-right text-slate-900 bg-transparent outline-none tabular-nums"
                          />
                          <span className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100/80 border-l border-slate-200 whitespace-nowrap">
                            {unit}
                          </span>
                        </div>

                        <span className="w-22 text-right text-xs font-extrabold text-[#064e2e] tabular-nums">
                          {formatCurrencyVnd(lineTotal)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Bỏ sản phẩm này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kỳ hạn, Tổng số lần giao & Khối lượng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Kỳ Hạn (Tháng) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={24}
                step={1}
                required
                value={form.Ky_han_thang}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="sub-pkg-delivery-count"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Tổng Số Lần Giao <span className="text-red-500">*</span>
              </label>
              <input
                id="sub-pkg-delivery-count"
                type="number"
                min={1}
                max={120}
                step={1}
                required
                value={deliveryCount}
                onChange={(e) => handleDeliveryCountChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-extrabold text-[#064e2e] tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Khối Lượng / Lần (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0.1}
                max={200}
                step="any"
                required
                value={form.Khoi_luong_moi_lan}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, Khoi_luong_moi_lan: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Khối tính giá tự động: (Giá 1 lần giao × Số lần giao) -> % Giảm -> Tổng giá gói */}
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#064e2e]">
                Tính Giá Gói & Ưu Đãi
              </h4>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {formatCurrencyVnd(singleDeliveryPrice)} × {safeDeliveryCount} lần giao
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Tổng giá gốc = Giá 1 lần giao × Số lần giao */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Giá gốc cả gói ({safeDeliveryCount} lần)
                </label>
                <div className="min-h-11 px-3.5 py-2.5 rounded-xl bg-white/85 border border-slate-200 text-sm font-extrabold text-slate-700 tabular-nums flex items-center justify-between">
                  <span>{formatCurrencyVnd(totalOriginalPrice)}</span>
                </div>
              </div>

              {/* 2. Phần trăm giảm giá */}
              <div>
                <label
                  htmlFor="sub-pkg-discount"
                  className="block text-[11px] font-bold text-slate-700 mb-1"
                >
                  Phần trăm giảm (%)
                </label>
                <div className="relative">
                  <input
                    id="sub-pkg-discount"
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={discountPercent}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-11 pl-3.5 pr-9 py-2 rounded-xl bg-white border border-emerald-300 text-sm font-extrabold text-amber-700 tabular-nums outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* 3. Tổng giá gói sau giảm */}
              <div>
                <label
                  htmlFor="sub-pkg-final-price"
                  className="block text-[11px] font-bold text-[#064e2e] mb-1"
                >
                  Tổng giá gói (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  id="sub-pkg-final-price"
                  type="number"
                  min={1000}
                  step={1}
                  required
                  value={form.Gia_goi}
                  onChange={(e) => handleManualPriceChange(e.target.value)}
                  className="w-full min-h-11 px-3.5 py-2 rounded-xl bg-white border-2 border-[#064e2e] text-sm font-black text-[#064e2e] tabular-nums outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {savedAmount > 0 && (
              <p className="text-xs font-semibold text-[#064e2e] tabular-nums">
                Khách hàng tiết kiệm được{" "}
                <strong>{formatCurrencyVnd(savedAmount)}</strong> ({Number(discountPercent) || 0}%)
                cho trọn gói {safeDeliveryCount} lần giao.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô Tả Gói
            </label>
            <textarea
              rows={2}
              value={form.Mo_ta}
              onChange={(e) => setForm((prev) => ({ ...prev, Mo_ta: e.target.value }))}
              placeholder="Mô tả lợi ích, tần suất giao gợi ý và đối tượng gia đình phù hợp..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Trạng Thái Mở Bán
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              {[
                { value: "Dang_mo", label: "Đang mở bán" },
                { value: "Tam_dung", label: "Tạm dừng" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, Trang_thai: opt.value }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.Trang_thai === opt.value
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </form>
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            form="admin-subscription-form"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingPackage ? "Lưu Thay Đổi" : "Tạo Gói Định Kỳ"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}