/* Master-detail side panel (desktop) & bottom-sheet modal (mobile) for Sales order & delivery details. */
import {
  Banknote,
  Check,
  CheckCircle2,
  ClipboardList,
  Info,
  Loader2,
  MapPin,
  PackageCheck,
  Receipt,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_LABELS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const DELIVERY_LABELS = {
  Chuan_bi: "Chuẩn bị hàng",
  Dang_giao: "Đang giao hàng",
  Giao_thanh_cong: "Giao thành công",
  Giao_that_bai: "Giao thất bại",
};

const PAYMENT_LABELS = {
  ApiPay: "ApiPay",
  COD: "COD",
  Mien_phi_goi: "Miễn phí gói",
  Giao_bu: "Giao bù",
};

const ORDER_TYPE_LABELS = {
  Dinh_ky: "Gói định kỳ",
  Giao_bu: "Đơn giao bù",
};

const CLAIM_STATUS_LABELS = {
  Cho_xu_ly: "Chờ tiếp nhận",
  Dang_xu_ly: "Đang xử lý",
  Da_giai_quyet: "Đã giải quyết",
  Tu_choi: "Từ chối",
};

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatFullDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
};

function getOrderFinancialMeta(order) {
  const payment = order.payments?.[0] || null;
  const method = payment?.method || "";
  const isReplacement =
    order.order_type === "Giao_bu" || method === "Giao_bu";
  const isSubscription =
    order.order_type === "Dinh_ky" || method === "Mien_phi_goi";
  const isZeroCharge = isReplacement || isSubscription;
  const isCancelled = order.status === "Da_huy";

  const total = Number(order.total ?? 0);
  const subtotal = Number(order.subtotal ?? 0);
  const referenceSubtotal = Number(order.reference_subtotal ?? subtotal);
  const shippingFee = Number(order.shipping_fee ?? 0);
  const distanceKm = Number(order.distance_km ?? 0);
  const pointsUsed = Number(order.points_used ?? 0);
  const pointsDiscount = Number(order.points_discount ?? 0);

  let collectionLabel = "Chờ thu tiền";
  let collectionClass = "text-amber-700";

  if (isReplacement) {
    collectionLabel = order.original_order_id
      ? `Miễn thu · Bù đơn #${order.original_order_id}`
      : "Miễn thu · Đơn giao bù";
    collectionClass = "text-violet-700";
  } else if (isSubscription) {
    collectionLabel = order.subscription?.subscription_id
      ? `Miễn thu · Đã trả gói #${order.subscription.subscription_id}`
      : "Miễn thu · Đã trả trọn gói";
    collectionClass = "text-violet-700";
  } else if (payment?.status === "Thanh_cong") {
    collectionLabel =
      method === "COD" ? "Đã thu tiền mặt (COD)" : "Đã thanh toán trực tuyến";
    collectionClass = "text-emerald-700";
  } else if (isCancelled) {
    collectionLabel = "Không thu (Đơn đã hủy)";
    collectionClass = "text-slate-400";
  } else if (method === "COD") {
    collectionLabel = "Thu tiền mặt khi giao (COD)";
  } else if (!payment) {
    collectionLabel = "Chưa có giao dịch";
    collectionClass = "text-slate-500";
  }

  return {
    payment,
    methodLabel: PAYMENT_LABELS[method] || "Chưa TT",
    isReplacement,
    isSubscription,
    isZeroCharge,
    total,
    subtotal,
    referenceSubtotal,
    shippingFee,
    distanceKm,
    pointsUsed,
    pointsDiscount,
    collectionLabel,
    collectionClass,
  };
}

export default function SalesOrderDetailPanel({
  selectedOrder,
  detailOrder,
  loadingDetail,
  detailSubTab,
  setDetailSubTab,
  allOrders = [],
  onCloseMobile,
  busyAction,
  onConfirmOrder,
  onConfirmCodPayment,
  onOpenDispatch,
}) {
  // Khung hướng dẫn khi chưa chọn đơn trên Desktop
  if (!selectedOrder) {
    return (
      <div className="hidden lg:flex min-w-0 flex-col h-full min-h-0">
        <div className="flex-1 h-full min-h-0 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
            <Receipt className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            Chi Tiết Đơn Hàng &amp; Giao Nhận
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Nhấp chọn một <strong>đơn hàng</strong> ở danh sách bên trái để kiểm tra phân bổ lô kho FEFO, phê duyệt đơn, xác nhận thu tiền COD hoặc theo dõi vận chuyển.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 max-w-xs text-left space-y-1.5">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quy trình xuất kho FEFO:</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Khi phê duyệt đơn hàng, hệ thống tự động trừ tồn từ các lô thu hoạch có hạn sử dụng gần nhất để đảm bảo độ tươi sạch.
            </p>
            <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-400">
              Hiển thị trên trang:{" "}
              <strong className="text-slate-600">{allOrders.length} đơn hàng</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeOrder = detailOrder || selectedOrder;
  const fin = getOrderFinancialMeta(activeOrder);
  const confirmBusy = busyAction === `confirm:${activeOrder.order_id}`;
  const codBusy = busyAction === `cod:${activeOrder.order_id}`;
  const hasActionButtons =
    Boolean(activeOrder.can_confirm) ||
    Boolean(activeOrder.can_dispatch) ||
    Boolean(activeOrder.can_confirm_cod_collection);
  const claimsCount = activeOrder.complaint_history?.length || 0;

  return (
    <div
      id="sales-order-detail-panel"
      className="h-full min-h-0 min-w-0 lg:rounded-2xl bg-white lg:border lg:border-slate-200/90 lg:shadow-xs flex flex-col overflow-hidden"
    >
      {/* Header đồng bộ kiểu Bottom-Sheet Modal (FlashSaleFormModal) */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/75 via-white to-amber-50/45 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 border border-emerald-300/70 flex items-center justify-center shrink-0 mt-0.5">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                Đơn #{activeOrder.order_id}
              </h3>
              {ORDER_TYPE_LABELS[activeOrder.order_type] && (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/80">
                  {ORDER_TYPE_LABELS[activeOrder.order_type]}
                </span>
              )}
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                  activeOrder.status === "Da_huy"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : activeOrder.status === "Cho_xac_nhan" ||
                        activeOrder.status === "Cho_thanh_toan"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-emerald-50 text-emerald-800 border-emerald-200"
                }`}
              >
                {STATUS_LABELS[activeOrder.status] || activeOrder.status}
              </span>
              {fin.payment?.method && (
                <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                  {fin.methodLabel}
                </span>
              )}
            </div>

            <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
              {activeOrder.customer?.name || "Khách hàng"} ·{" "}
              <span className="font-normal text-slate-500 tabular-nums">
                {activeOrder.customer?.phone || activeOrder.customer?.email || "—"} ·{" "}
                {formatFullDateTime(activeOrder.ordered_at)}
              </span>
            </p>
          </div>
        </div>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng chi tiết đơn hàng"
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nội dung cuộn nội bộ */}
      <div className="overflow-y-auto scrollbar-thin flex-1 min-h-0">
        {/* Khối thông tin tóm tắt & Địa chỉ giao nhận */}
        <div className="p-4 sm:p-5 space-y-3.5">
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                {fin.isZeroCharge ? "Số Tiền Thu Thêm" : "Tổng Thanh Toán"}
              </span>
              <strong className="text-emerald-700 text-sm font-black tabular-nums mt-0.5 block">
                {currencyFormatter.format(fin.total)}
              </strong>
              <span
                className={`text-[10.5px] font-bold mt-0.5 block ${fin.collectionClass}`}
              >
                {fin.collectionLabel}
              </span>
              {fin.isZeroCharge && fin.referenceSubtotal > 0 && (
                <span className="text-[10.5px] text-slate-500 mt-1 block tabular-nums">
                  Giá trị hàng xuất:{" "}
                  <strong className="text-slate-700">
                    {currencyFormatter.format(fin.referenceSubtotal)}
                  </strong>
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Trạng Thái Giao Nhận
              </span>
              <strong className="text-slate-800 tabular-nums mt-0.5 block truncate">
                {DELIVERY_LABELS[activeOrder.delivery?.status] ||
                  "Chờ điều phối giao"}
              </strong>
              <span className="text-[10.5px] font-mono font-semibold text-emerald-700 mt-0.5 block truncate">
                {activeOrder.delivery?.tracking_number
                  ? `Vận đơn: ${activeOrder.delivery.tracking_number}`
                  : "Chưa có mã vận đơn"}
              </span>
            </div>
          </div>

          {/* Thông tin người nhận & Địa chỉ giao hàng */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs">
            <div className="flex items-start gap-2">
              <UserRound className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Người nhận hàng
                </span>
                <strong className="text-slate-800">
                  {activeOrder.address?.recipient_name ||
                    activeOrder.customer?.name ||
                    "Khách hàng"}
                </strong>
                <span className="text-slate-500 ml-1.5 tabular-nums">
                  {activeOrder.address?.phone || activeOrder.customer?.phone || ""}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-slate-200/60">
              <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Địa chỉ giao nhận
                </span>
                <p className="text-slate-700 leading-relaxed break-words mt-0.5">
                  {activeOrder.address?.detail || "Không có thông tin địa chỉ"}
                </p>
              </div>
            </div>

            {activeOrder.note && (
              <div className="pt-2 border-t border-slate-200/60 text-[11.5px] text-slate-600">
                <span className="font-bold text-slate-700">Ghi chú khách: </span>
                <span>{activeOrder.note}</span>
              </div>
            )}
          </div>

          {/* Sub-tabs: Sản phẩm & FEFO | Giao nhận & Cước phí | Khiếu nại */}
          <div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 mb-3">
              {[
                {
                  id: "items",
                  label: `Sản phẩm (${activeOrder.items?.length || 0})`,
                },
                {
                  id: "delivery",
                  label: "Giao nhận & Phí",
                },
                {
                  id: "claims",
                  label: `Khiếu nại (${claimsCount})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDetailSubTab(tab.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                    detailSubTab === tab.id
                      ? "bg-white text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingDetail ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>Đang tải chi tiết đơn hàng...</span>
              </div>
            ) : detailSubTab === "items" ? (
              <div className="space-y-2">
                {(activeOrder.items || []).map((item) => {
                  const refLineTotal = Number(
                    item.reference_line_total ??
                      Number(item.reference_unit_price ?? item.unit_price ?? 0) *
                        Number(item.quantity || 0)
                  );

                  return (
                    <div
                      key={item.product_id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 break-words leading-snug">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                            {fin.isZeroCharge ? (
                              <>
                                Số lượng:{" "}
                                <strong className="text-slate-700">
                                  {item.quantity} {item.unit}
                                </strong>
                              </>
                            ) : (
                              <>
                                {currencyFormatter.format(item.unit_price || 0)} ×{" "}
                                <strong className="text-slate-700">
                                  {item.quantity} {item.unit}
                                </strong>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="text-right tabular-nums shrink-0">
                          {fin.isZeroCharge ? (
                            <>
                              <span className="font-extrabold text-emerald-700 block">
                                {fin.isReplacement
                                  ? "Giao bù (0 ₫)"
                                  : "Theo gói (0 ₫)"}
                              </span>
                              {refLineTotal > 0 && (
                                <span className="text-[10.5px] text-slate-500 block">
                                  Giá trị: {currencyFormatter.format(refLineTotal)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-extrabold text-slate-900">
                              {currencyFormatter.format(item.line_total || 0)}
                            </span>
                          )}
                        </div>
                      </div>

                      {item.allocations?.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200/60">
                          <span className="text-[10.5px] font-semibold text-emerald-800">
                            Lô FEFO:
                          </span>
                          {item.allocations.map((alloc) => (
                            <span
                              key={`${item.product_id}-${alloc.batch_id}`}
                              className="font-mono text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                            >
                              #{alloc.batch_id} ({alloc.quantity}
                              {item.unit ? ` ${item.unit}` : ""} · HSD{" "}
                              {alloc.expiry_date || "—"})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10.5px] text-amber-700 italic pt-1 border-t border-slate-200/60">
                          Chưa phân bổ lô xuất kho (chờ phê duyệt đơn).
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : detailSubTab === "delivery" ? (
              <div className="space-y-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                      <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Thông tin vận chuyển</span>
                    </div>
                    {activeOrder.can_dispatch && onOpenDispatch && (
                      <button
                        type="button"
                        onClick={() => onOpenDispatch(activeOrder)}
                        disabled={Boolean(busyAction)}
                        className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer disabled:opacity-50"
                      >
                        {activeOrder.delivery ? "Cập nhật" : "+ Điều phối"}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Trạng thái giao:</span>
                    <strong className="text-slate-800">
                      {DELIVERY_LABELS[activeOrder.delivery?.status] ||
                        "Chưa khởi tạo vận đơn"}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Đơn vị vận chuyển:</span>
                    <span className="font-semibold text-slate-800">
                      {activeOrder.delivery?.carrier || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Mã vận đơn:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {activeOrder.delivery?.tracking_number || "—"}
                    </span>
                  </div>
                  {activeOrder.delivery?.dispatcher_name && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Nhân viên điều phối:</span>
                      <span className="font-semibold text-slate-800">
                        {activeOrder.delivery.dispatcher_name}
                      </span>
                    </div>
                  )}
                  {activeOrder.delivery?.shipped_at && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Thời gian xuất giao:</span>
                      <span className="text-slate-700 tabular-nums">
                        {formatFullDateTime(activeOrder.delivery.shipped_at)}
                      </span>
                    </div>
                  )}
                  {activeOrder.delivery?.delivered_at && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Giao thành công lúc:</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {formatFullDateTime(activeOrder.delivery.delivered_at)}
                      </span>
                    </div>
                  )}
                  {activeOrder.original_order_id && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Đơn hàng gốc:</span>
                      <Link
                        to={`/sales/orders?order_id=${activeOrder.original_order_id}`}
                        className="font-mono font-bold text-emerald-700 hover:underline"
                      >
                        #{activeOrder.original_order_id}
                      </Link>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 tabular-nums">
                  <div className="flex items-start justify-between gap-2 text-slate-600">
                    <span>Tiền hàng ({activeOrder.items?.length || 0} SP):</span>
                    <div className="text-right">
                      <span className="font-semibold text-slate-800 block">
                        {currencyFormatter.format(fin.subtotal)}
                      </span>
                      {fin.isZeroCharge && fin.referenceSubtotal > 0 && (
                        <span className="text-[10.5px] text-slate-500 block">
                          (Giá trị quy đổi:{" "}
                          {currencyFormatter.format(fin.referenceSubtotal)})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-slate-600">
                    <span>
                      Phí giao hàng
                      {fin.distanceKm > 0 ? ` (${fin.distanceKm} km)` : ""}:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {fin.isZeroCharge
                        ? `Miễn phí (${
                            fin.isReplacement
                              ? "Bù khiếu nại"
                              : "Gồm trong gói"
                          })`
                        : currencyFormatter.format(fin.shippingFee)}
                    </span>
                  </div>

                  {fin.pointsDiscount > 0 && (
                    <div className="flex items-center justify-between gap-2 text-emerald-700">
                      <span>
                        Giảm từ điểm thưởng ({fin.pointsUsed} điểm):
                      </span>
                      <span className="font-semibold">
                        -{currencyFormatter.format(fin.pointsDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-sm font-black text-emerald-800">
                    <span>
                      {fin.isZeroCharge
                        ? "Tổng thu thêm:"
                        : "Tổng cộng:"}
                    </span>
                    <span>{currencyFormatter.format(fin.total)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                    <span>Đối soát thanh toán:</span>
                    <span className="font-semibold text-slate-700 text-right">
                      {fin.methodLabel} · {fin.collectionLabel}
                    </span>
                  </div>

                  {fin.isReplacement && activeOrder.original_order_id && (
                    <div className="mt-2 p-2.5 rounded-xl bg-violet-50/80 border border-violet-200/80 text-[11px] text-violet-950 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-violet-700 shrink-0 mt-0.5" />
                      <p>
                        Đơn giao bù miễn phí cho{" "}
                        <Link
                          to={`/sales/orders?order_id=${activeOrder.original_order_id}`}
                          className="font-bold underline text-violet-800"
                        >
                          đơn gốc #{activeOrder.original_order_id}
                        </Link>
                        {activeOrder.original_order?.total > 0
                          ? ` (khách đã thanh toán ${currencyFormatter.format(
                              activeOrder.original_order.total
                            )})`
                          : ""}
                        .
                      </p>
                    </div>
                  )}

                  {fin.isSubscription && (
                    <div className="mt-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-950 flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                      <p>
                        Đơn tự động sinh từ{" "}
                        <strong>
                          {activeOrder.subscription?.package_name ||
                            "Gói định kỳ"}
                          {activeOrder.subscription?.subscription_id
                            ? ` (#${activeOrder.subscription.subscription_id})`
                            : ""}
                        </strong>
                        {activeOrder.subscription?.package_price > 0
                          ? ` — khách đã thanh toán trọn gói ${currencyFormatter.format(
                              activeOrder.subscription.package_price
                            )}.`
                          : " — khách đã thanh toán trọn gói."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {claimsCount > 0 ? (
                  activeOrder.complaint_history.map((claim) => (
                    <div
                      key={claim.claim_id}
                      className="p-3 rounded-xl bg-violet-50/60 border border-violet-200/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          Khiếu nại #{claim.claim_id} ·{" "}
                          {CLAIM_STATUS_LABELS[claim.status] || claim.status}
                        </span>
                        <Link
                          to="/sales/claims"
                          className="font-bold text-violet-800 hover:underline shrink-0"
                        >
                          Xem hồ sơ
                        </Link>
                      </div>
                      <p className="text-slate-600 break-words">{claim.reason}</p>
                      {claim.resolution === "Hoan_tien" && (
                        <p className="font-semibold text-emerald-800">
                          Hoàn tiền{" "}
                          {currencyFormatter.format(claim.refund_amount || 0)}
                        </p>
                      )}
                      {claim.replacement_order_id && (
                        <Link
                          to={`/sales/orders?order_id=${claim.replacement_order_id}`}
                          className="inline-block font-semibold text-emerald-800 hover:underline"
                        >
                          Đơn giao bù #{claim.replacement_order_id}
                        </Link>
                      )}
                      {claim.feedback && (
                        <p className="text-slate-700">
                          Phản hồi: {claim.feedback}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="py-5 text-center text-xs text-slate-400 italic">
                    Đơn hàng này chưa phát sinh khiếu nại nào.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer cố định chứa các nút thao tác đơn hàng */}
      {(hasActionButtons || onCloseMobile) && (
        <div className="px-4 py-3 sm:px-5 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center justify-end gap-2 shrink-0">
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Đóng
            </button>
          )}

          {activeOrder.can_confirm && (
            <button
              type="button"
              onClick={() => onConfirmOrder(activeOrder)}
              disabled={Boolean(busyAction)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <PackageCheck className="w-4 h-4 shrink-0" />
              <span>{confirmBusy ? "Đang phê duyệt..." : "Phê Duyệt Đơn"}</span>
            </button>
          )}

          {activeOrder.can_dispatch && onOpenDispatch && (
            <button
              type="button"
              onClick={() => onOpenDispatch(activeOrder)}
              disabled={Boolean(busyAction)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span>
                {activeOrder.delivery
                  ? "Cập Nhật Giao Nhận"
                  : "Điều Phối Giao Hàng"}
              </span>
            </button>
          )}

          {activeOrder.can_confirm_cod_collection && (
            <button
              type="button"
              onClick={() => onConfirmCodPayment(activeOrder)}
              disabled={Boolean(busyAction)}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              <Banknote className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {codBusy ? "Đang ghi nhận..." : "Xác Nhận Thu COD"}
              </span>
              {!codBusy && <Check className="w-3.5 h-3.5 shrink-0" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}