import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Package,
  Pause,
  Play,
  RefreshCw,
  Truck,
} from "lucide-react";
import EmptyState from "../../components/common/EmptyState";
import { confirmGlobalDialog, showGlobalToast } from "../../components/GlobalToast";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { customerApi } from "../../services/customerApi";

const ORDER_STATUS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

const ORDER_TYPE = {
  Mua_le: "Mua lẻ",
  Dinh_ky: "Gói định kỳ",
  Giao_bu: "Giao bù",
};

const SUBSCRIPTION_STATUS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Dang_hoat_dong: "Đang hoạt động",
  Tam_dung: "Tạm ngưng",
  Het_han: "Hết hạn",
  Da_huy: "Đã hủy",
};

const WEEKDAYS = ["", "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const money = (value) => `${Number(value || 0).toLocaleString("vi-VN")} đ`;
const dateTime = (value) =>
  value ? new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";
const date = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "—");

function StatusBadge({ status, labels }) {
  const completed = ["Hoan_thanh", "Dang_hoat_dong"].includes(status);
  const inactive = ["Da_huy", "Het_han"].includes(status);
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        completed
          ? "bg-emerald-50 text-emerald-800"
          : inactive
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-50 text-amber-800"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [orderStatus, setOrderStatus] = useState("");
  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [ordersMeta, setOrdersMeta] = useState(null);
  const [subscriptionsMeta, setSubscriptionsMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState({});
  const [changingSubscriptionId, setChangingSubscriptionId] = useState(null);
  const [loadError, setLoadError] = useState("");

  const loadOrders = useCallback(async (page = 1, status = orderStatus, append = false) => {
    try {
      const response = await customerApi.getOrders({
        page,
        per_page: 10,
        ...(status ? { status } : {}),
      });
      setOrders((current) => append ? [...current, ...response.data] : response.data);
      setOrdersMeta(response.meta);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Không thể tải lịch sử đơn hàng.");
    }
  }, [orderStatus]);

  const loadSubscriptions = useCallback(async (page = 1, append = false) => {
    try {
      const response = await customerApi.getSubscriptions({ page, per_page: 10 });
      setSubscriptions((current) => append ? [...current, ...response.data] : response.data);
      setSubscriptionsMeta(response.meta);
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Không thể tải danh sách gói định kỳ.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const load = activeTab === "orders"
      ? loadOrders(1, orderStatus)
      : loadSubscriptions(1);
    load.finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeTab, orderStatus, loadOrders, loadSubscriptions]);

  const loadMore = async () => {
    const meta = activeTab === "orders" ? ordersMeta : subscriptionsMeta;
    if (!meta || meta.current_page >= meta.last_page) return;
    setLoadingMore(true);
    try {
      if (activeTab === "orders") {
        await loadOrders(meta.current_page + 1, orderStatus, true);
      } else {
        await loadSubscriptions(meta.current_page + 1, true);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleOrderDetails = async (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }
    setExpandedOrderId(orderId);
    if (orderDetails[orderId]) return;

    try {
      const response = await customerApi.getOrder(orderId);
      setOrderDetails((current) => ({ ...current, [orderId]: response.data }));
    } catch (error) {
      notifyApiErrorToast(error, "Không thể tải chi tiết đơn hàng.");
      setExpandedOrderId(null);
    }
  };

  const cancelOrder = async (order) => {
    const confirmed = await confirmGlobalDialog({
      title: "Hủy đơn hàng",
      message: `Bạn có chắc muốn hủy đơn hàng #${order.order_id}? Điểm đã sử dụng sẽ được hoàn lại nếu có.`,
      confirmLabel: "Hủy đơn",
      cancelLabel: "Quay lại",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const response = await customerApi.cancelRetailOrder(order.order_id);
      showGlobalToast(
        response.data.points_refunded > 0
          ? `Đã hủy đơn và hoàn ${response.data.points_refunded} điểm.`
          : "Đã hủy đơn hàng.",
        "success"
      );
      await loadOrders(1, orderStatus);
      setOrderDetails((current) => {
        const next = { ...current };
        delete next[order.order_id];
        return next;
      });
    } catch (error) {
      notifyApiErrorToast(error, "Không thể hủy đơn hàng.");
    }
  };

  const changeSubscriptionStatus = async (subscription) => {
    const pausing = subscription.can_pause;
    const confirmed = await confirmGlobalDialog({
      title: pausing ? "Tạm ngưng gói" : "Tiếp tục gói",
      message: pausing
        ? "Lịch giao sẽ tạm dừng đến khi bạn tiếp tục. Ngày kết thúc gói vẫn giữ nguyên."
        : "Lịch giao của gói sẽ được kích hoạt lại.",
      confirmLabel: pausing ? "Tạm ngưng" : "Tiếp tục",
      cancelLabel: "Để sau",
      variant: pausing ? "danger" : "default",
    });
    if (!confirmed) return;

    setChangingSubscriptionId(subscription.subscription_id);
    try {
      if (pausing) {
        await customerApi.pauseSubscription(subscription.subscription_id);
      } else {
        await customerApi.resumeSubscription(subscription.subscription_id);
      }
      showGlobalToast(pausing ? "Đã tạm ngưng gói định kỳ." : "Đã tiếp tục gói định kỳ.", "success");
      await loadSubscriptions(1);
    } catch (error) {
      notifyApiErrorToast(error, "Không thể cập nhật gói định kỳ.");
    } finally {
      setChangingSubscriptionId(null);
    }
  };

  const currentItems = activeTab === "orders" ? orders : subscriptions;
  const currentMeta = activeTab === "orders" ? ordersMeta : subscriptionsMeta;

  return (
    <main className="min-h-screen bg-[#f5f5f5] py-8 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#006e1c]">Tài khoản khách hàng</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#191c1b]">Đơn hàng của tôi</h1>
            <p className="mt-1 text-sm text-[#5a6357]">Theo dõi đơn mua và lịch giao gói định kỳ.</p>
          </div>
          <Link to="/rewards?tab=rewards" className="text-sm font-bold text-[#006e1c] hover:underline">
            Xem ví điểm thưởng
          </Link>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex gap-2">
            {[
              ["orders", "Tất cả đơn hàng"],
              ["subscriptions", "Gói định kỳ"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-3 text-sm font-bold ${
                  activeTab === tab
                    ? "border-[#006e1c] text-[#006e1c]"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === "subscriptions" && (
            <Link to="/subscriptions" className="pb-2 text-sm font-semibold text-[#006e1c] hover:underline">
              Đăng ký gói mới
            </Link>
          )}
          {activeTab === "orders" && (
            <label className="pb-2 text-sm text-slate-600">
              <span className="sr-only">Lọc trạng thái đơn hàng</span>
              <select
                value={orderStatus}
                onChange={(event) => setOrderStatus(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(ORDER_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-[#006e1c]" aria-label="Đang tải" />
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
            <p>{loadError}</p>
            <button
              type="button"
              className="mt-3 font-bold underline"
              onClick={() => activeTab === "orders" ? loadOrders() : loadSubscriptions()}
            >
              Thử tải lại
            </button>
          </div>
        ) : currentItems.length === 0 ? (
          <EmptyState
            icon={activeTab === "orders" ? Package : CalendarDays}
            title={activeTab === "orders" ? "Chưa có đơn hàng" : "Chưa đăng ký gói định kỳ"}
            message={activeTab === "orders"
              ? "Các đơn mua lẻ của bạn sẽ hiển thị tại đây."
              : "Đăng ký một gói để theo dõi lịch giao và trạng thái tại đây."}
            actionLabel={activeTab === "orders" ? "Khám phá sản phẩm" : "Xem các gói rau"}
            onAction={() => navigate(activeTab === "orders" ? "/products" : "/subscriptions")}
          />
        ) : (
          <div className="space-y-4">
            {activeTab === "orders" ? orders.map((order) => {
              const details = orderDetails[order.order_id];
              const expanded = expandedOrderId === order.order_id;
              return (
                <article key={order.order_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="font-bold text-slate-900">Đơn #{order.order_id}</span>
                      <span className="text-slate-500">{ORDER_TYPE[order.order_type] || order.order_type}</span>
                      <span className="text-slate-500">{dateTime(order.ordered_at)}</span>
                      <StatusBadge status={order.status} labels={ORDER_STATUS} />
                    </div>
                    <span className="font-extrabold text-[#006e1c]">{money(order.total)}</span>
                  </div>
                  <div className="space-y-3 px-5 py-4">
                    {(order.items || []).map((item, index) => (
                      <div key={`${item.product_id}-${index}`} className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
                            <Package className="h-5 w-5 text-slate-400" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.quantity} {item.unit || ""} × {money(item.unit_price)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{money(item.line_total)}</span>
                      </div>
                    ))}
                    <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                      <span className="text-slate-500">
                        {order.delivery?.tracking_number
                          ? `Vận đơn: ${order.delivery.tracking_number}`
                          : order.address?.detail || "Chưa có thông tin giao hàng"}
                      </span>
                      <div className="flex gap-2">
                        {order.can_cancel && (
                          <button
                            type="button"
                            onClick={() => cancelOrder(order)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Hủy đơn
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleOrderDetails(order.order_id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiết {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {expanded && (
                      <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                        {!details ? (
                          <p className="text-slate-500">Đang tải chi tiết đơn hàng…</p>
                        ) : (
                          <>
                            <div>
                              <h2 className="mb-2 font-bold text-slate-800">Thanh toán</h2>
                              {details.payments.length ? details.payments.map((payment, index) => (
                                <p key={`${payment.method}-${index}`} className="text-slate-600">
                                  {payment.method} · {payment.status} · {money(payment.amount)}
                                </p>
                              )) : <p className="text-slate-500">Chưa có giao dịch thanh toán.</p>}
                              <p className="mt-2 text-slate-600">Phí giao hàng: {money(details.shipping_fee)}</p>
                              {details.points_used > 0 && (
                                <p className="text-slate-600">
                                  Điểm sử dụng: {details.points_used} (giảm {money(details.points_discount)})
                                </p>
                              )}
                            </div>
                            <div>
                              <h2 className="mb-2 font-bold text-slate-800">Giao hàng</h2>
                              <p className="text-slate-600">{details.address?.recipient_name} · {details.address?.phone}</p>
                              <p className="text-slate-600">{details.address?.detail}</p>
                              {details.delivery && (
                                <p className="mt-1 inline-flex items-center gap-1 text-slate-600">
                                  <Truck className="h-4 w-4" />
                                  {details.delivery.carrier || "Đơn vị vận chuyển"} · {details.delivery.status}
                                </p>
                              )}
                              {details.note && <p className="mt-2 text-slate-600">Ghi chú: {details.note}</p>}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            }) : subscriptions.map((subscription) => (
              <article key={subscription.subscription_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-extrabold text-slate-900">
                        {subscription.package?.name || `Gói #${subscription.subscription_id}`}
                      </h2>
                      <StatusBadge status={subscription.status} labels={SUBSCRIPTION_STATUS} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Mã gói #{subscription.subscription_id} · {date(subscription.start_date)} – {date(subscription.end_date)}
                    </p>
                  </div>
                  {(subscription.can_pause || subscription.can_resume) && (
                    <button
                      type="button"
                      disabled={changingSubscriptionId === subscription.subscription_id}
                      onClick={() => changeSubscriptionStatus(subscription)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#006e1c] px-4 py-2 text-sm font-bold text-[#006e1c] hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {changingSubscriptionId === subscription.subscription_id
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : subscription.can_pause ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {subscription.can_pause ? "Tạm ngưng" : "Tiếp tục"}
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Lịch giao</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {(subscription.delivery_days || []).map((delivery) =>
                        `${WEEKDAYS[delivery.weekday]}${delivery.delivery_window ? ` · ${delivery.delivery_window}` : ""}`
                      ).join("  |  ") || "Chưa có lịch giao"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{subscription.address}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Đơn giao đã tạo</h3>
                    {subscription.deliveries?.length ? (
                      <ul className="mt-1 space-y-1">
                        {subscription.deliveries.map((delivery) => (
                          <li key={delivery.order_id} className="text-sm text-slate-600">
                            <Link to="/orders" className="font-semibold text-[#006e1c] hover:underline">
                              Đơn #{delivery.order_id}
                            </Link>
                            {" · "}{dateTime(delivery.ordered_at)} · {ORDER_STATUS[delivery.status] || delivery.status}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">Chưa phát sinh đơn giao.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {currentMeta && currentMeta.current_page < currentMeta.last_page && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="mx-auto flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore && <RefreshCw className="h-4 w-4 animate-spin" />}
                Tải thêm
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
