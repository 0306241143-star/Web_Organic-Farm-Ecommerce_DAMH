/* Thẻ hiển thị gói rau định kỳ đã đăng ký và thao tác tạm ngưng / tiếp tục gói. */
import { Pause, Play, RefreshCw } from "lucide-react";
import {
  ORDER_STATUS,
  SUBSCRIPTION_STATUS,
  WEEKDAYS,
  OrderStatusBadge,
  formatOrderDate,
  formatOrderDateTime,
} from "./orderHistoryUtils";

export default function SubscriptionHistoryCard({
  subscription,
  isChanging,
  onToggleStatus,
  onViewOrders,
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">
              {subscription.package?.name || `Gói #${subscription.subscription_id}`}
            </h2>
            <OrderStatusBadge
              status={subscription.status}
              labels={SUBSCRIPTION_STATUS}
            />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Mã gói #{subscription.subscription_id} ·{" "}
            {formatOrderDate(subscription.start_date)} –{" "}
            {formatOrderDate(subscription.end_date)}
          </p>
        </div>

        {(subscription.can_pause || subscription.can_resume) && (
          <button
            type="button"
            disabled={isChanging}
            onClick={() => onToggleStatus(subscription)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#006e1c] px-4 py-2 text-sm font-bold text-[#006e1c] hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
          >
            {isChanging ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : subscription.can_pause ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {subscription.can_pause ? "Tạm ngưng" : "Tiếp tục"}
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Lịch giao</h3>
          <p className="mt-1 text-sm text-slate-600">
            {(subscription.delivery_days || [])
              .map(
                (delivery) =>
                  `${WEEKDAYS[delivery.weekday]}${
                    delivery.delivery_window ? ` · ${delivery.delivery_window}` : ""
                  }`
              )
              .join("  |  ") || "Chưa có lịch giao"}
          </p>
          <p className="mt-2 text-xs text-slate-500">{subscription.address}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800">Đơn giao đã tạo</h3>
          {subscription.deliveries?.length ? (
            <ul className="mt-1 space-y-1">
              {subscription.deliveries.map((delivery) => (
                <li key={delivery.order_id} className="text-sm text-slate-600">
                  <button
                    type="button"
                    onClick={onViewOrders}
                    className="font-semibold text-[#006e1c] hover:underline cursor-pointer"
                  >
                    Đơn #{delivery.order_id}
                  </button>
                  {" · "}
                  {formatOrderDateTime(delivery.ordered_at)} ·{" "}
                  {ORDER_STATUS[delivery.status] || delivery.status}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Chưa phát sinh đơn giao.</p>
          )}
        </div>
      </div>
    </article>
  );
}