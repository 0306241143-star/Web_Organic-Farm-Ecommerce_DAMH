import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Pagination from "../../components/common/Pagination";
import { showGlobalToast } from "../../components/GlobalToast";
import DispatchOrderModal from "../../components/sales/modals/DispatchOrderModal";
import SalesOrderDetailPanel from "../../components/sales/orders/SalesOrderDetailPanel";
import SalesOrderTable from "../../components/sales/orders/SalesOrderTable";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { salesApi } from "../../services/salesApi";

const PER_PAGE = 10;

const STATUS_TABS = [
  { id: "", label: "Tất cả" },
  { id: "Cho_xac_nhan", label: "Chờ xác nhận" },
  { id: "Da_xac_nhan", label: "Đã xác nhận" },
  { id: "Dang_giao", label: "Đang giao" },
  { id: "Hoan_thanh", label: "Hoàn thành" },
  { id: "Cho_thanh_toan", label: "Chờ thanh toán" },
  { id: "Da_huy", label: "Đã hủy" },
];

const PAYMENT_OPTIONS = [
  { value: "", label: "Tất cả thanh toán" },
  { value: "ApiPay", label: "ApiPay" },
  { value: "COD", label: "COD" },
  { value: "Mien_phi_goi", label: "Miễn phí gói" },
  { value: "Giao_bu", label: "Giao bù" },
];

export default function SalesOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdParam = searchParams.get("order_id") || "";

  const [orders, setOrders] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [dispatchingOrder, setDispatchingOrder] = useState(null);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const [selectedOrderId, setSelectedOrderId] = useState(() =>
    orderIdParam ? Number(orderIdParam) : null
  );
  const [detailSubTab, setDetailSubTab] = useState("items");

  // Tải đơn hàng cùng cảnh báo tồn kho để trang có đủ dữ liệu điều phối và FEFO.
  const fetchOrders = useCallback(
    async (isSilent = false, announceRefresh = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      setError("");

      try {
        const [response, alertResponse] = await Promise.all([
          salesApi.getOrders({
            status: status || undefined,
            payment_method: paymentMethod || undefined,
            order_id: orderIdParam || undefined,
            page,
            per_page: PER_PAGE,
          }),
          salesApi.getRecurringStockAlerts(),
        ]);

        const list = response.data || [];
        setStockAlerts(alertResponse.data || []);
        setOrders(list);
        setMeta(
          response.meta || {
            current_page: 1,
            last_page: 1,
            per_page: PER_PAGE,
            total: list.length,
          }
        );

        setSelectedOrderId((prevId) => {
          if (orderIdParam) {
            const target = list.find(
              (o) => Number(o.order_id) === Number(orderIdParam)
            );
            if (target) return target.order_id;
          }
          if (prevId && list.some((o) => o.order_id === prevId)) {
            return prevId;
          }
          return list[0]?.order_id ?? null;
        });

        if (isSilent && announceRefresh) {
          showGlobalToast("Đã cập nhật danh sách đơn hàng!");
        }
      } catch (requestError) {
        setError(
          requestError.message || "Không thể tải danh sách đơn hàng."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, paymentMethod, orderIdParam, page]
  );

  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchOrders(true);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const kw = searchInput.trim().toLowerCase();
    if (!kw) return orders;

    return orders.filter((order) => {
      const idMatch =
        `#${order.order_id}`.includes(kw) ||
        String(order.order_id).includes(kw);
      const customerMatch =
        String(order.customer?.name || "").toLowerCase().includes(kw) ||
        String(order.customer?.phone || "").toLowerCase().includes(kw) ||
        String(order.address?.recipient_name || "")
          .toLowerCase()
          .includes(kw) ||
        String(order.address?.phone || "").toLowerCase().includes(kw);
      const itemMatch = (order.items || []).some((item) =>
        String(item.name || "").toLowerCase().includes(kw)
      );
      return idMatch || customerMatch || itemMatch;
    });
  }, [orders, searchInput]);

  const selectedOrder = useMemo(() => {
    if (!filteredOrders.length) return null;
    return (
      filteredOrders.find((o) => o.order_id === selectedOrderId) ||
      filteredOrders[0]
    );
  }, [filteredOrders, selectedOrderId]);

  const handleSelectOrder = (order) => {
    if (!order) {
      setIsMobileDetailOpen(false);
      return;
    }
    const id = typeof order === "object" ? order.order_id ?? order.id : order;
    setSelectedOrderId(id);
    setIsMobileDetailOpen(true);
  };

  const handleCloseMobileDetail = () => {
    setIsMobileDetailOpen(false);
  };

  const clearOrderIdFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("order_id");
    setSearchParams(nextParams, { replace: true });
    setPage(1);
  };

  const runOrderAction = async (order, action, successMessage) => {
    const key = `${action}:${order.order_id}`;
    setBusyAction(key);
    setError("");
    try {
      if (action === "confirm") {
        await salesApi.confirmOrder(order.order_id);
      } else {
        await salesApi.confirmCodPayment(order.order_id);
      }
      showGlobalToast(successMessage);
      await fetchOrders(true);
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật đơn hàng.");
    } finally {
      setBusyAction("");
    }
  };

  const handleDispatchSubmit = async (payload) => {
    if (!dispatchingOrder?.order_id) return;
    const targetOrder = dispatchingOrder;
    setBusyAction(`dispatch:${targetOrder.order_id}`);
    try {
      await salesApi.dispatchOrder(targetOrder.order_id, payload);
      showGlobalToast(
        `Đã cập nhật điều phối giao hàng cho đơn #${targetOrder.order_id}!`
      );
      setDispatchingOrder(null);
      await fetchOrders(false);
    } catch (requestError) {
      notifyApiErrorToast(
        requestError,
        "Không thể cập nhật điều phối giao hàng."
      );
    } finally {
      setBusyAction("");
    }
  };

  const handleReplaceShortageProduct = async (order, detailId, productId) => {
    setBusyAction(`replace:${order.order_id}:${detailId}`);
    try {
      const response = await salesApi.replaceShortageProduct(
        order.order_id,
        detailId,
        productId
      );
      showGlobalToast(response.message || "Đã cập nhật sản phẩm thay thế.");
      await fetchOrders(true);
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể thay thế sản phẩm thiếu.");
    } finally {
      setBusyAction("");
    }
  };

  const handlePostponeShortageOrder = async (order) => {
    setBusyAction(`postpone:${order.order_id}`);
    try {
      const response = await salesApi.postponeShortageOrder(order.order_id);
      showGlobalToast(
        `Đã hoãn đơn #${order.order_id} đến ${new Date(
          response.data?.scheduled_delivery_at
        ).toLocaleDateString("vi-VN")}.`
      );
      await fetchOrders(true);
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể hoãn đơn định kỳ.");
    } finally {
      setBusyAction("");
    }
  };

  const openStockAlert = (alert) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("order_id", String(alert.order_id));
    setSearchParams(nextParams);
    setStatus("Cho_xac_nhan");
    setPaymentMethod("");
    setPage(1);
    setSelectedOrderId(alert.order_id);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 min-h-full lg:h-screen flex flex-col lg:overflow-hidden bg-[#f8faf8]">
      {/* THANH TIÊU ĐỀ & BỘ LỌC */}
      <div className="relative shrink-0 z-20 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-[1440px] mx-auto px-3.5 sm:px-6 pt-3 pb-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                <span>Bán Hàng & CSKH</span>
                <span className="text-slate-300">•</span>
                <span className="normal-case font-semibold text-emerald-800 truncate">
                  Phê duyệt đơn, đối soát tiền & điều phối giao nhận
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span>Quản Lý Đơn Hàng & Giao Nhận</span>
                {orderIdParam && (
                  <button
                    type="button"
                    onClick={clearOrderIdFilter}
                    className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    Đơn #{orderIdParam}
                    <X className="w-3 h-3" />
                  </button>
                )}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 tabular-nums">
                Tổng: <strong className="text-slate-800">{meta.total}</strong> đơn
              </span>
              <button
                type="button"
                onClick={() => fetchOrders(true, true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Làm mới danh sách"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    refreshing ? "animate-spin text-emerald-600" : ""
                  }`}
                />
                <span className="hidden sm:inline">Làm mới</span>
              </button>
            </div>
          </div>

          {/* Hàng lọc trạng thái + phương thức thanh toán + ô tìm kiếm */}
          <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    status === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <select
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
                aria-label="Lọc theo phương thức thanh toán"
                className="px-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm #mã đơn, khách, SĐT, SP..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Xóa từ khóa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực nội dung chính: Mobile cuộn tự nhiên, Desktop (lg+) chia 2 cột */}
      <div className="flex-1 lg:min-h-0 max-w-[1440px] w-full mx-auto px-3.5 sm:px-6 py-3 sm:py-4 lg:overflow-hidden flex flex-col gap-2">
        {stockAlerts.length > 0 && (
          <section className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-900">
            <div className="flex items-center gap-2 font-extrabold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
              <span>{stockAlerts.length} đơn định kỳ thiếu hàng hoặc đang được hoãn</span>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {stockAlerts.slice(0, 3).map((alert) => {
                const missingItems = alert.stock_alert?.items || [];
                const summary = missingItems
                  .map((item) => `${item.product_name} thiếu ${item.missing_quantity} ${item.unit || ""}`)
                  .join(", ");

                return (
                  <button
                    key={alert.order_id}
                    type="button"
                    onClick={() => openStockAlert(alert)}
                    className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-left font-semibold hover:bg-rose-100"
                  >
                    Đơn #{alert.order_id}
                    {summary ? `: ${summary}` : ` · Hoãn đến ${alert.stock_alert.postponed_until}`}
                  </button>
                );
              })}
              {stockAlerts.length > 3 && (
                <button
                  type="button"
                  onClick={() => {
                    setStatus("Cho_xac_nhan");
                    setPaymentMethod("Mien_phi_goi");
                    setPage(1);
                  }}
                  className="rounded-full px-2 py-1 font-bold underline"
                >
                  Xem các đơn định kỳ
                </button>
              )}
            </div>
          </section>
        )}
        <div className="grid flex-1 lg:h-full min-h-0 grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
          <div className="lg:col-span-7 min-w-0 lg:min-h-0 flex flex-col gap-3">
            <div className="lg:flex-1 lg:min-h-0 flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
              {error && (
                <div
                  role="alert"
                  className="m-3 mb-0 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-red-700 flex items-center gap-2 shrink-0"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto scrollbar-thin">
                <SalesOrderTable
                  orders={filteredOrders}
                  totalCount={meta.total}
                  loading={loading}
                  selectedOrder={selectedOrder}
                  onSelectOrder={handleSelectOrder}
                />
              </div>
            </div>

            {meta.total > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 px-3.5 py-3 shadow-2xs shrink-0">
                <Pagination
                  currentPage={meta.current_page}
                  lastPage={meta.last_page}
                  total={meta.total}
                  perPage={meta.per_page}
                  onPageChange={handlePageChange}
                  itemLabel="đơn hàng"
                />
              </div>
            )}
          </div>

          <aside className="hidden lg:block lg:col-span-5 min-w-0 min-h-0 h-full">
            <SalesOrderDetailPanel
              selectedOrder={selectedOrder}
              detailOrder={selectedOrder}
              loadingDetail={false}
              detailSubTab={detailSubTab}
              setDetailSubTab={setDetailSubTab}
              allOrders={filteredOrders}
              onSelectOrder={handleSelectOrder}
              busyAction={busyAction}
              onConfirmOrder={(order) =>
                runOrderAction(order, "confirm", "Đơn hàng đã được phê duyệt.")
              }
              onConfirmCodPayment={(order) =>
                runOrderAction(order, "cod", "Đã ghi nhận thu tiền COD.")
              }
              onOpenDispatch={setDispatchingOrder}
              onReplaceShortageProduct={handleReplaceShortageProduct}
              onPostponeShortageOrder={handlePostponeShortageOrder}
            />
          </aside>
        </div>
      </div>

      {/* Bottom-Sheet Modal chi tiết đơn hàng trên Mobile */}
      {isMobileDetailOpen && selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết đơn hàng #${selectedOrder.order_id}`}
          className="fixed inset-0 z-40 lg:hidden flex items-end justify-center p-0 bg-slate-900/55 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseMobileDetail();
          }}
        >
          <div className="w-full max-h-[92dvh] bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150">
            <SalesOrderDetailPanel
              selectedOrder={selectedOrder}
              detailOrder={selectedOrder}
              loadingDetail={false}
              detailSubTab={detailSubTab}
              setDetailSubTab={setDetailSubTab}
              allOrders={filteredOrders}
              onSelectOrder={handleSelectOrder}
              onCloseMobile={handleCloseMobileDetail}
              busyAction={busyAction}
              onConfirmOrder={(order) =>
                runOrderAction(order, "confirm", "Đơn hàng đã được phê duyệt.")
              }
              onConfirmCodPayment={(order) =>
                runOrderAction(order, "cod", "Đã ghi nhận thu tiền COD.")
              }
              onOpenDispatch={setDispatchingOrder}
              onReplaceShortageProduct={handleReplaceShortageProduct}
              onPostponeShortageOrder={handlePostponeShortageOrder}
            />
          </div>
        </div>
      )}

      <DispatchOrderModal
        open={Boolean(dispatchingOrder)}
        order={dispatchingOrder}
        submitting={
          Boolean(dispatchingOrder) &&
          busyAction === `dispatch:${dispatchingOrder.order_id}`
        }
        onClose={() => setDispatchingOrder(null)}
        onSubmit={handleDispatchSubmit}
      />
    </div>
  );
}