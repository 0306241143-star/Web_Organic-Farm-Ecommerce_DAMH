import { Banknote, Check, MapPin, PackageCheck, UserRound } from "lucide-react";
import Badge from "../common/Badge";

const STATUS_LABELS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const STATUS_VARIANTS = {
  Cho_thanh_toan: "warning",
  Cho_xac_nhan: "warning",
  Da_xac_nhan: "primary",
  Dang_giao: "primary",
  Hoan_thanh: "success",
  Da_huy: "danger",
};

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const paymentLabel = (method) =>
  ({
    ApiPay: "ApiPay",
    COD: "COD",
    Mien_phi_goi: "Miễn phí gói",
    Giao_bu: "Giao bù",
  })[method] || method;

export default function SalesOrderCard({
  order,
  busyAction,
  onConfirm,
  onConfirmCodPayment,
}) {
  const payment = order.payments?.[0];
  const confirmBusy = busyAction === `confirm:${order.order_id}`;
  const codBusy = busyAction === `cod:${order.order_id}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#c0c9bb]/40 bg-white shadow-xs">
      <header className="flex flex-col gap-3 border-b border-[#c0c9bb]/25 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-[#00450d]">Đơn hàng #{order.order_id}</h2>
          <Badge variant={STATUS_VARIANTS[order.status] || "neutral"}>
            {STATUS_LABELS[order.status] || order.status}
          </Badge>
          <Badge variant="neutral">{paymentLabel(payment?.method) || "Chưa có thanh toán"}</Badge>
        </div>
        <time className="text-xs text-[#5a6357]">{dateTime(order.ordered_at)}</time>
      </header>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-2 text-sm text-[#41493e] sm:grid-cols-2">
            <p className="flex items-start gap-2">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#006e1c]" />
              <span>
                <strong className="text-[#191c1b]">{order.customer?.name || "Khách hàng"}</strong>
                <span className="block text-xs">{order.customer?.phone || order.customer?.email}</span>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#006e1c]" />
              <span className="min-w-0">
                <strong className="text-[#191c1b]">{order.address?.recipient_name || "Địa chỉ nhận hàng"}</strong>
                <span className="block break-words text-xs">{order.address?.detail || "Không có địa chỉ"}</span>
              </span>
            </p>
          </div>

          <ul className="divide-y divide-[#c0c9bb]/20 rounded-xl bg-[#f8faf8] px-3">
            {(order.items || []).map((item) => (
              <li key={item.product_id} className="py-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#191c1b]">
                    {item.name} <span className="font-normal text-[#5a6357]">× {item.quantity} {item.unit}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{currency.format(item.line_total)}</span>
                </div>
                {item.allocations?.length > 0 && (
                  <p className="mt-1 text-xs text-[#5a6357]">
                    Lô FEFO:{" "}
                    {item.allocations
                      .map((allocation) =>
                        `#${allocation.batch_id} (${allocation.quantity}${item.unit ? ` ${item.unit}` : ""}, HSD ${allocation.expiry_date || "—"})`
                      )
                      .join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {order.note && (
            <p className="text-xs text-[#5a6357]">
              Ghi chú: <span className="text-[#191c1b]">{order.note}</span>
            </p>
          )}
        </div>

        <aside className="flex flex-col justify-between gap-4 border-t border-[#c0c9bb]/25 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3 text-[#5a6357]">
              <dt>Tiền hàng</dt>
              <dd>{currency.format(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-[#5a6357]">
              <dt>Phí giao hàng</dt>
              <dd>{currency.format(order.shipping_fee)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#c0c9bb]/25 pt-2 font-bold text-[#00450d]">
              <dt>Tổng cộng</dt>
              <dd>{currency.format(order.total)}</dd>
            </div>
            {payment && (
              <div className="flex items-center justify-between gap-3 text-xs text-[#5a6357]">
                <dt>Thanh toán</dt>
                <dd>{payment.status === "Thanh_cong" ? "Đã thanh toán" : "Chưa thu tiền"}</dd>
              </div>
            )}
          </dl>

          <div className="grid gap-2">
            {order.can_confirm && (
              <button
                type="button"
                onClick={() => onConfirm(order)}
                disabled={Boolean(busyAction)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#00450d] px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-[#006e1c] disabled:cursor-wait disabled:opacity-60"
              >
                <PackageCheck className="h-4 w-4" />
                {confirmBusy ? "Đang phê duyệt..." : "Phê duyệt đơn"}
              </button>
            )}
            {order.can_confirm_cod_collection && (
              <button
                type="button"
                onClick={() => onConfirmCodPayment(order)}
                disabled={Boolean(busyAction)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
              >
                <Banknote className="h-4 w-4" />
                {codBusy ? "Đang ghi nhận..." : "Xác nhận đã thu COD"}
                {!codBusy && <Check className="h-4 w-4" />}
              </button>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
