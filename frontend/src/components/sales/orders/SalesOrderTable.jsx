/* Compact order & delivery table (desktop) and card list (mobile) matching Farm's BatchTable. */
import {
  Banknote,
  Calendar,
  ChevronRight,
  ClipboardList,
  Loader2,
  Truck,
} from "lucide-react";

const STATUS_LABELS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const STATUS_BADGE_CLASSES = {
  Cho_thanh_toan: "bg-amber-50 text-amber-800 border-amber-200",
  Cho_xac_nhan: "bg-amber-50 text-amber-800 border-amber-200",
  Da_xac_nhan: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Dang_giao: "bg-sky-50 text-sky-800 border-sky-200",
  Hoan_thanh: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Da_huy: "bg-red-50 text-red-800 border-red-200",
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

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatShortDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

function getPaymentDisplay(order) {
  const payment = order.payments?.[0];
  const method = payment?.method || "";
  const isReplacement =
    order.order_type === "Giao_bu" || method === "Giao_bu";
  const isSubscription =
    order.order_type === "Dinh_ky" || method === "Mien_phi_goi";
  const isZeroCharge = isReplacement || isSubscription;
  const isCancelled = order.status === "Da_huy";

  const referenceSubtotal = Number(
    order.reference_subtotal ?? order.subtotal ?? 0
  );
  const pointsDiscount = Number(order.points_discount ?? 0);

  let statusTag = "• Chờ thu";
  let statusClass = "text-amber-700";

  if (isReplacement) {
    statusTag = "• Miễn thu";
    statusClass = "text-violet-700";
  } else if (isSubscription) {
    statusTag = "• Đã trả gói";
    statusClass = "text-violet-700";
  } else if (payment?.status === "Thanh_cong") {
    statusTag = "• Đã thu";
    statusClass = "text-emerald-700";
  } else if (isCancelled) {
    statusTag = "• Đã hủy";
    statusClass = "text-slate-400";
  } else if (method === "COD") {
    statusTag = "• Chờ thu COD";
  }

  let subNote = "";
  if (isZeroCharge && referenceSubtotal > 0) {
    subNote = `Giá trị hàng xuất: ${currencyFormatter.format(referenceSubtotal)}`;
  } else if (pointsDiscount > 0) {
    subNote = `Giảm điểm: -${currencyFormatter.format(pointsDiscount)}`;
  }

  return {
    payment,
    methodLabel: PAYMENT_LABELS[method] || "Chưa TT",
    isZeroCharge,
    isCancelled,
    statusTag,
    statusClass,
    subNote,
  };
}

export default function SalesOrderTable({
  orders = [],
  totalCount,
  loading = false,
  selectedOrder,
  onSelectOrder,
}) {
  const displayTotal = totalCount ?? orders.length;

  return (
    <div className="bg-white overflow-hidden">
      {/* Banner hướng dẫn chọn dòng (đồng nhất BatchTable) */}
      {!loading && orders.length > 0 && !selectedOrder && (
        <div className="px-3.5 sm:px-4 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span className="truncate">
            Bấm chọn vào bất kỳ đơn hàng nào bên dưới để xem chi tiết, lô FEFO &amp; giao nhận.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {displayTotal} đơn
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách đơn hàng &amp; giao nhận...
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-7 h-7" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-700">
            Không tìm thấy đơn hàng nào
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Thử thay đổi bộ lọc trạng thái, thanh toán hoặc từ khóa tìm kiếm khác.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90">
                  <th className="py-2.5 px-3.5 w-[32%]">Đơn Hàng &amp; Khách</th>
                  <th className="py-2.5 px-2.5 w-[28%]">Thanh Toán</th>
                  <th className="py-2.5 px-2.5 w-[20%]">Giao Nhận</th>
                  <th className="py-2.5 px-3.5 w-[20%] text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {orders.map((order) => {
                  const isSelected =
                    String(selectedOrder?.order_id) === String(order.order_id);
                  const payInfo = getPaymentDisplay(order);
                  const itemCount = order.items?.length || 0;

                  return (
                    <tr
                      key={order.order_id}
                      role="button"
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => onSelectOrder(order)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectOrder(order);
                        }
                      }}
                      className={`transition-colors cursor-pointer group focus:outline-none focus-visible:bg-emerald-50/90 ${
                        isSelected
                          ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-200"
                          : "hover:bg-slate-50/90"
                      }`}
                    >
                      {/* Cột 1: Mã đơn, Khách hàng & Số lượng mặt hàng */}
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-[11px] text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/80">
                              #{order.order_id}
                            </span>
                            {ORDER_TYPE_LABELS[order.order_type] && (
                              <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-200/70">
                                {ORDER_TYPE_LABELS[order.order_type]}
                              </span>
                            )}
                          </div>
                          <div
                            className="font-bold text-slate-800 truncate mt-1"
                            title={order.customer?.name}
                          >
                            {order.customer?.name || "Khách hàng"}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {order.customer?.phone || order.customer?.email || "—"} ·{" "}
                            <span className="font-semibold text-slate-600">
                              {itemCount} SP
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Cột 2: Tổng tiền, Phương thức & Giá trị quy đổi */}
                      <td className="py-2.5 px-2.5 align-middle tabular-nums">
                        <div className="flex flex-wrap items-baseline gap-1">
                          <span
                            className={`font-extrabold text-[12px] ${
                              payInfo.isCancelled
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {currencyFormatter.format(order.total || 0)}
                          </span>
                          {payInfo.isZeroCharge && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              (Thu thêm)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            <Banknote className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{payInfo.methodLabel}</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold ${payInfo.statusClass}`}
                          >
                            {payInfo.statusTag}
                          </span>
                        </div>

                        {payInfo.subNote && (
                          <div className="text-[10.5px] text-slate-500 truncate mt-1">
                            {payInfo.subNote}
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Thời gian đặt & Thông tin vận chuyển */}
                      <td className="py-2.5 px-2.5 align-middle tabular-nums">
                        <div className="text-[11px] text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{formatShortDateTime(order.ordered_at)}</span>
                        </div>
                        <div className="text-[11px] text-slate-700 font-semibold flex items-center gap-1 mt-1 truncate">
                          <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {order.delivery?.tracking_number
                              ? order.delivery.tracking_number
                              : DELIVERY_LABELS[order.delivery?.status] || "Chưa điều phối"}
                          </span>
                        </div>
                      </td>

                      {/* Cột 4: Trạng thái đơn & Mũi tên chọn */}
                      <td className="py-2.5 px-3.5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                              STATUS_BADGE_CLASSES[order.status] ||
                              "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isSelected
                                ? "text-emerald-700 translate-x-0.5"
                                : "text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5"
                            }`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {orders.map((order) => {
              const isSelected =
                String(selectedOrder?.order_id) === String(order.order_id);
              const payInfo = getPaymentDisplay(order);

              return (
                <div
                  key={order.order_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectOrder(order)}
                  className={`p-3.5 space-y-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50/80 ring-1 ring-inset ring-emerald-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                          #{order.order_id}
                        </span>
                        {ORDER_TYPE_LABELS[order.order_type] && (
                          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200/70">
                            {ORDER_TYPE_LABELS[order.order_type]}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {payInfo.methodLabel}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug truncate">
                        {order.customer?.name || "Khách hàng"}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {order.customer?.phone || "—"} · {order.items?.length || 0} mặt hàng
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        STATUS_BADGE_CLASSES[order.status] ||
                        "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">
                        {payInfo.isZeroCharge ? "Thu thêm:" : "Tổng thanh toán:"}
                      </span>
                      <div className="text-right tabular-nums">
                        <span className="font-extrabold text-slate-900">
                          {currencyFormatter.format(order.total || 0)}
                        </span>{" "}
                        <span className={`text-[11px] font-bold ${payInfo.statusClass}`}>
                          {payInfo.statusTag}
                        </span>
                      </div>
                    </div>
                    {payInfo.subNote && (
                      <div className="text-[11px] text-slate-500 text-right tabular-nums">
                        {payInfo.subNote}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Đặt lúc: {formatShortDateTime(order.ordered_at)}</span>
                      <span className="font-semibold text-emerald-800 truncate max-w-[140px]">
                        {order.delivery?.tracking_number ||
                          DELIVERY_LABELS[order.delivery?.status] ||
                          "Chờ điều phối"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-xs text-emerald-700 font-bold gap-1 pt-0.5">
                    <span>
                      {isSelected
                        ? "Đang xem chi tiết đơn hàng"
                        : "Chạm để xem chi tiết & xử lý đơn"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}