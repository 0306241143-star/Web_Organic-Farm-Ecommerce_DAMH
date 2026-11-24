/* Trang giỏ hàng mua lẻ: giữ cố định thanh tiêu đề phía trên, chỉ cuộn vùng danh sách bên dưới. */
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Apple,
  ArrowLeft,
  Carrot,
  CheckCircle2,
  ChevronRight,
  Flame,
  Leaf,
  Loader2,
  Minus,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Trash2,
} from "lucide-react";
import CartSummaryBox from "../../components/customer/CartSummaryBox";
import { confirmGlobalDialog, showGlobalToast } from "../../components/GlobalToast";
import { useCart } from "../../context/useCart";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { formatCurrencyVnd } from "../../services/publicApi";

function pickCategoryVisual(categoryName = "") {
  const normalized = String(categoryName).toLowerCase();
  if (normalized.includes("trái cây") || normalized.includes("quả")) {
    return {
      Icon: Apple,
      accent: "from-emerald-50 via-lime-50/70 to-emerald-100/40 text-[#006e1c]",
    };
  }
  if (normalized.includes("củ")) {
    return {
      Icon: Carrot,
      accent: "from-amber-50/80 via-emerald-50/50 to-lime-50/60 text-[#00450d]",
    };
  }
  if (normalized.includes("gia vị") || normalized.includes("thảo mộc")) {
    return {
      Icon: Sprout,
      accent: "from-teal-50/70 via-emerald-50/70 to-lime-50/50 text-[#006e1c]",
    };
  }
  return {
    Icon: Leaf,
    accent: "from-[#f2f4f2] via-emerald-50/80 to-lime-50/50 text-[#00450d]",
  };
}

function CartItemMedia({ item, productId, name, categoryName }) {
  const [imgFailed, setImgFailed] = useState(false);
  const rawImage =
    item.image_url || item.image || item.product?.image_url || item.product?.image || "";
  const showImage = Boolean(rawImage) && !imgFailed;
  const { Icon: FallbackIcon, accent } = pickCategoryVisual(categoryName);

  return (
    <Link
      to={`/products/${productId}`}
      className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#f2f4f2] border border-[#c0c9bb]/40 shrink-0 group/img focus:outline-none"
      aria-label={`Xem chi tiết ${name}`}
    >
      {showImage ? (
        <img
          src={rawImage}
          alt={name}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-br ${accent} flex flex-col items-center justify-center p-2 text-center`}
        >
          <div className="w-9 h-9 rounded-xl bg-white/90 border border-[#c0c9bb]/40 flex items-center justify-center mb-1">
            <FallbackIcon className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#41493e]/80 line-clamp-1">
            {categoryName || "Hữu cơ"}
          </span>
        </div>
      )}
    </Link>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const {
    items = [],
    isLoading,
    error,
    refreshCart,
    updateItem,
    removeItem,
    clearCart,
  } = useCart();

  const [pendingProductIds, setPendingProductIds] = useState([]);
  const [clearingAll, setClearingAll] = useState(false);

  const normalizedItems = useMemo(() => {
    return (Array.isArray(items) ? items : []).map((raw) => {
      const product = raw.product || {};
      const productId = raw.product_id ?? product.id ?? raw.id;
      const name = raw.name ?? product.name ?? "Nông sản hữu cơ";
      const unit = raw.unit ?? product.unit ?? "kg";
      const categoryName =
        raw.category?.name ??
        raw.category_name ??
        product.category?.name ??
        "";
      const unitPrice = Number(
        raw.unit_price ??
          raw.effective_price ??
          raw.price ??
          product.effective_price ??
          product.price ??
          0
      );
      const originalPrice = Number(
        raw.base_price ?? raw.regular_price ?? product.price ?? unitPrice
      );
      const quantity = Math.max(0, Number(raw.quantity ?? 1) || 1);
      const subtotal = Number(raw.subtotal ?? unitPrice * quantity);
      const availableStock =
        raw.available_stock !== undefined
          ? Number(raw.available_stock)
          : product.available_stock !== undefined
          ? Number(product.available_stock)
          : null;
      const isFlashSale = Boolean(raw.is_flash_sale ?? product.is_flash_sale);
      const traceQrCode = raw.trace_qr_code ?? product.trace_qr_code ?? "";
      const standard =
        raw.certification_standards?.[0] ??
        product.certification_standards?.[0] ??
        "";

      return {
        raw,
        productId,
        name,
        unit,
        categoryName,
        unitPrice,
        originalPrice,
        quantity,
        subtotal,
        availableStock,
        isFlashSale,
        traceQrCode,
        standard,
      };
    });
  }, [items]);

  const { totalQuantity, subtotal, hasStockIssue } = useMemo(() => {
    let qtySum = 0;
    let moneySum = 0;
    let stockIssue = false;

    normalizedItems.forEach((item) => {
      qtySum += item.quantity;
      moneySum += item.subtotal;
      if (
        item.availableStock !== null &&
        Number.isFinite(item.availableStock) &&
        (item.availableStock <= 0 || item.quantity > item.availableStock)
      ) {
        stockIssue = true;
      }
    });

    return {
      totalQuantity: Math.round(qtySum * 100) / 100,
      subtotal: Math.round(moneySum),
      hasStockIssue: stockIssue,
    };
  }, [normalizedItems]);

  const isProductPending = (productId) =>
    pendingProductIds.some((id) => String(id) === String(productId));

  const setProductPending = (productId, pending) => {
    setPendingProductIds((prev) =>
      pending
        ? [...prev, productId]
        : prev.filter((id) => String(id) !== String(productId))
    );
  };

  const handleChangeQuantity = async (item, nextQty) => {
    if (isProductPending(item.productId)) return;

    const roundedQty = Math.round(nextQty * 100) / 100;
    if (roundedQty <= 0) {
      await handleRemoveItem(item);
      return;
    }

    if (
      item.availableStock !== null &&
      Number.isFinite(item.availableStock) &&
      roundedQty > item.availableStock
    ) {
      showGlobalToast(
        `Sản phẩm "${item.name}" hiện chỉ còn tối đa ${item.availableStock} ${item.unit}.`,
        "warning"
      );
      return;
    }

    setProductPending(item.productId, true);
    try {
      await updateItem(item.productId, roundedQty);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể cập nhật số lượng sản phẩm.");
    } finally {
      setProductPending(item.productId, false);
    }
  };

  const handleRemoveItem = async (item) => {
    if (isProductPending(item.productId)) return;

    setProductPending(item.productId, true);
    try {
      await removeItem(item.productId);
      showGlobalToast(`Đã xóa "${item.name}" khỏi giỏ hàng.`, "info");
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa sản phẩm khỏi giỏ hàng.");
    } finally {
      setProductPending(item.productId, false);
    }
  };

  const handleClearAll = async () => {
    if (clearingAll || normalizedItems.length === 0) return;

    const confirmed = await confirmGlobalDialog({
      title: "Xóa toàn bộ giỏ hàng?",
      message: `Bạn có chắc chắn muốn xóa tất cả ${normalizedItems.length} sản phẩm đang có trong giỏ hàng không?`,
      confirmLabel: "Xóa tất cả",
      variant: "danger",
    });
    if (!confirmed) return;

    setClearingAll(true);
    try {
      if (typeof clearCart === "function") {
        await clearCart();
      } else {
        for (const item of normalizedItems) {
          await removeItem(item.productId);
        }
      }
      showGlobalToast("Đã dọn trống giỏ hàng.", "info");
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa toàn bộ giỏ hàng.");
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <div className="bg-[#f6f8f6] h-[calc(100dvh-5rem)] flex flex-col overflow-hidden">
      {/* ================= 1. PHẦN TRÊN CỐ ĐỊNH KHÔNG CUỘN ================= */}
      <header className="shrink-0 bg-white/95 backdrop-blur-md border-b border-[#c0c9bb]/40 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 sm:py-4">
          <nav
            aria-label="Đường dẫn trang"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5a6357] mb-2"
          >
            <Link to="/" className="hover:text-[#00450d] transition-colors">
              Trang Chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#5a6357]/70" />
            <span className="text-[#00450d] font-bold">Giỏ Hàng & Đặt Hàng</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#00450d] text-white flex items-center justify-center shadow-xs shrink-0">
                <ShoppingBag className="w-5 h-5 text-[#91f78e]" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    className="text-xl sm:text-[26px] font-extrabold text-[#00450d] tracking-tight leading-tight truncate"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Giỏ Hàng & Đặt Hàng
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#91f78e]/35 border border-[#006e1c]/25 text-[#00450d] text-xs font-extrabold tabular-nums shrink-0">
                    {normalizedItems.length} sản phẩm
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-[#5a6357] mt-0.5 truncate">
                  Kiểm tra danh sách nông sản tươi đã chọn trước khi chuyển sang bước giao hàng & thanh toán.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              {normalizedItems.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200/80 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{clearingAll ? "Đang xóa..." : "Xóa tất cả"}</span>
                </button>
              )}

              <Link
                to="/products"
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-white hover:bg-[#f2f4f2] text-[#191c1b] border border-[#c0c9bb]/70 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#006e1c]" />
                <span>Tiếp tục mua sắm</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================= 2. VÙNG NỘI DUNG CUỘN ĐỘC LẬP BÊN DƯỚI ================= */}
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-24 lg:pb-10">
          {/* Thông báo lỗi kết nối giỏ hàng */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl bg-red-50 border border-red-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm text-red-800"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
              <button
                type="button"
                onClick={() => refreshCart?.()}
                className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white border border-red-200 text-xs font-bold text-red-700 hover:bg-red-100 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại</span>
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-3.5">
                {[1, 2].map((idx) => (
                  <div
                    key={idx}
                    className="rounded-3xl bg-white border border-[#c0c9bb]/40 p-4 sm:p-5 flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#eceeec] shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-3 w-24 rounded bg-[#eceeec]" />
                      <div className="h-5 w-2/3 rounded bg-[#e6e9e7]" />
                      <div className="h-4 w-32 rounded bg-[#f2f4f2]" />
                    </div>
                    <div className="h-10 w-28 rounded-xl bg-[#eceeec]" />
                  </div>
                ))}
              </div>
              <div className="lg:col-span-4 h-80 rounded-3xl bg-white border border-[#c0c9bb]/40 animate-pulse" />
            </div>
          ) : normalizedItems.length === 0 ? (
            /* TRẠNG THÁI GIỎ HÀNG TRỐNG */
            <section className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-10 sm:p-14 text-center shadow-2xs max-w-2xl mx-auto my-4">
              <div className="w-16 h-16 rounded-3xl bg-[#91f78e]/30 border border-[#006e1c]/20 text-[#00450d] flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#191c1b]">
                Giỏ hàng của bạn đang trống
              </h2>
              <p className="text-xs sm:text-sm text-[#5a6357] max-w-md mx-auto mt-2 leading-relaxed">
                Khám phá các loại rau củ hữu cơ thu hoạch trong ngày, trái cây nhà màng đạt chuẩn
                VietGAP và các gói rau định kỳ tiện lợi.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/products"
                  className="px-5 py-3 rounded-2xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-extrabold shadow-xs transition-colors inline-flex items-center gap-2"
                >
                  <Sprout className="w-4 h-4 text-[#91f78e]" />
                  <span>Khám phá nông sản sạch</span>
                </Link>
                <Link
                  to="/subscriptions"
                  className="px-5 py-3 rounded-2xl bg-[#f2f4f2] hover:bg-[#e6e9e7] text-[#00450d] text-xs sm:text-sm font-bold transition-colors"
                >
                  Xem gói rau định kỳ (-20%)
                </Link>
              </div>
            </section>
          ) : (
            /* DANH SÁCH SẢN PHẨM (8 CỘT) & TÓM TẮT ĐƠN HÀNG (4 CỘT) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <section
                aria-label="Danh sách nông sản trong giỏ"
                className="lg:col-span-8 space-y-3.5"
              >
                {hasStockIssue && (
                  <div
                    role="alert"
                    className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900"
                  >
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Một số sản phẩm trong giỏ hiện vượt quá tồn kho khả dụng hoặc vừa tạm hết
                      hàng. Vui lòng giảm số lượng hoặc xóa sản phẩm đó trước khi tiếp tục đặt hàng.
                    </span>
                  </div>
                )}

                {normalizedItems.map((item) => {
                  const pending = isProductPending(item.productId);
                  const hasDiscount =
                    item.originalPrice > item.unitPrice && item.unitPrice > 0;
                  const isOutOfStock =
                    item.availableStock !== null && item.availableStock <= 0;
                  const exceedsStock =
                    item.availableStock !== null &&
                    item.availableStock > 0 &&
                    item.quantity > item.availableStock;

                  return (
                    <article
                      key={item.productId}
                      className={`rounded-3xl bg-white border p-4 sm:p-5 shadow-2xs transition-all ${
                        isOutOfStock || exceedsStock
                          ? "border-amber-300 bg-amber-50/20"
                          : "border-[#c0c9bb]/50 hover:border-[#006e1c]/40 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Trái: Ảnh + Thông tin nông sản */}
                        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                          <CartItemMedia
                            item={item.raw}
                            productId={item.productId}
                            name={item.name}
                            categoryName={item.categoryName}
                          />

                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Nhãn danh mục / chứng nhận / Flash Sale */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              {item.categoryName && (
                                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#006e1c]">
                                  {item.categoryName}
                                </span>
                              )}
                              {item.isFlashSale && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-extrabold">
                                  <Flame className="w-3 h-3" />
                                  Flash Sale
                                </span>
                              )}
                              {item.standard && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f2f4f2] text-[#41493e] text-[10px] font-bold">
                                  <ShieldCheck className="w-3 h-3 text-[#006e1c]" />
                                  {item.standard}
                                </span>
                              )}
                            </div>

                            <Link
                              to={`/products/${item.productId}`}
                              className="block text-base sm:text-[17px] font-extrabold text-[#191c1b] hover:text-[#00450d] leading-snug line-clamp-2 transition-colors"
                            >
                              {item.name}
                            </Link>

                            {/* Đơn giá */}
                            <div className="flex items-baseline flex-wrap gap-x-1.5 text-xs sm:text-[13px] tabular-nums">
                              <span className="font-bold text-[#00450d]">
                                {formatCurrencyVnd(item.unitPrice)}
                              </span>
                              <span className="text-[#5a6357]">/ {item.unit}</span>
                              {hasDiscount && (
                                <span className="text-[11.5px] text-[#5a6357] line-through">
                                  {formatCurrencyVnd(item.originalPrice)}
                                </span>
                              )}
                            </div>

                            {/* Tình trạng tồn kho & Mã truy xuất QR */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[11.5px]">
                              {isOutOfStock ? (
                                <span className="font-bold text-rose-600">
                                  Sản phẩm hiện tạm hết hàng
                                </span>
                              ) : exceedsStock ? (
                                <span className="font-bold text-amber-700">
                                  Chỉ còn {item.availableStock} {item.unit} trong kho
                                </span>
                              ) : item.availableStock !== null ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[#006e1c] tabular-nums">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  Còn {item.availableStock} {item.unit}
                                </span>
                              ) : null}

                              {item.traceQrCode && (
                                <Link
                                  to={`/trace/${encodeURIComponent(item.traceQrCode)}`}
                                  className="inline-flex items-center gap-1 font-semibold text-[#5a6357] hover:text-[#00450d] transition-colors"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-[#006e1c]" />
                                  <span>Truy xuất lô</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Phải: Bộ chọn số lượng + Thành tiền + Nút xóa */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#c0c9bb]/30 shrink-0">
                          <div
                            className="inline-flex items-center rounded-2xl bg-[#f8faf8] border border-[#c0c9bb]/70 p-1"
                            role="group"
                            aria-label={`Điều chỉnh số lượng ${item.name}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleChangeQuantity(item, item.quantity - 1)}
                              disabled={pending || item.quantity <= 1}
                              aria-label="Giảm số lượng"
                              className="w-8 h-8 rounded-xl bg-white hover:bg-[#eceeec] text-[#191c1b] flex items-center justify-center border border-[#c0c9bb]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <span className="w-11 text-center text-sm font-extrabold text-[#191c1b] tabular-nums select-none">
                              {pending ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#00450d] mx-auto" />
                              ) : (
                                item.quantity
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleChangeQuantity(item, item.quantity + 1)}
                              disabled={
                                pending ||
                                isOutOfStock ||
                                (item.availableStock !== null &&
                                  item.quantity >= item.availableStock)
                              }
                              aria-label="Tăng số lượng"
                              className="w-8 h-8 rounded-xl bg-white hover:bg-[#eceeec] text-[#191c1b] flex items-center justify-center border border-[#c0c9bb]/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[96px]">
                            <div className="text-base sm:text-lg font-black text-[#00450d] tabular-nums">
                              {formatCurrencyVnd(item.subtotal)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item)}
                              disabled={pending}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors disabled:opacity-40 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>

              {/* CỘT TÓM TẮT ĐƠN HÀNG (4 CỘT) */}
              <div className="lg:col-span-4">
                <CartSummaryBox
                  itemsCount={normalizedItems.length}
                  totalQuantity={totalQuantity}
                  subtotal={subtotal}
                  hasStockIssue={hasStockIssue}
                  isBusy={pendingProductIds.length > 0 || clearingAll}
                  onProceedCheckout={() => navigate("/checkout")}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= THANH ĐẶT HÀNG CỐ ĐỊNH DƯỚI ĐÁY TRÊN MOBILE ================= */}
      {!isLoading && normalizedItems.length > 0 && (
        <div className="shrink-0 lg:hidden bg-white/95 backdrop-blur-md border-t border-[#c0c9bb]/50 px-4 py-3 shadow-lg z-30">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] font-semibold text-[#5a6357]">
                Tạm tính ({normalizedItems.length} món)
              </span>
              <span className="text-lg font-black text-[#00450d] tabular-nums">
                {formatCurrencyVnd(subtotal)}
              </span>
            </div>
            <button
              type="button"
              disabled={
                normalizedItems.length === 0 ||
                hasStockIssue ||
                pendingProductIds.length > 0 ||
                clearingAll
              }
              onClick={() => navigate("/checkout")}
              className="px-5 py-2.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-extrabold shadow-xs disabled:bg-slate-300 cursor-pointer"
            >
              Tiếp tục đặt hàng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}