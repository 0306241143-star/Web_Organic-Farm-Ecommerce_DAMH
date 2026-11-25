import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardList, RefreshCw } from "lucide-react";
import Pagination from "../../components/common/Pagination";
import SalesOrderCard from "../../components/sales/SalesOrderCard";
import SalesOrderFilters from "../../components/sales/SalesOrderFilters";
import { salesApi } from "../../services/salesApi";

export default function SalesOrderPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    salesApi
      .getOrders({
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        order_id: orderId || undefined,
        page,
        per_page: 10,
      })
      .then((response) => {
        if (!active) return;
        setOrders(response.data || []);
        setMeta(response.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải danh sách đơn hàng.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status, paymentMethod, orderId, page, refreshKey]);

  const updateStatus = (value) => {
    setLoading(true);
    setError("");
    setStatus(value);
    setPage(1);
    setNotice("");
  };

  const updatePaymentMethod = (value) => {
    setLoading(true);
    setError("");
    setPaymentMethod(value);
    setPage(1);
    setNotice("");
  };

  const runOrderAction = async (order, action, successMessage) => {
    const key = `${action}:${order.order_id}`;
    setBusyAction(key);
    setError("");
    setNotice("");
    try {
      if (action === "confirm") {
        await salesApi.confirmOrder(order.order_id);
      } else {
        await salesApi.confirmCodPayment(order.order_id);
      }
      setNotice(successMessage);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message || "Không thể cập nhật đơn hàng.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">
            Bán hàng & chăm sóc khách hàng
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#00450d]">
            <ClipboardList className="h-6 w-6" />
            Quản lý đơn hàng
          </h1>
          <p className="mt-1 text-sm text-[#5a6357]">
            Phê duyệt đơn, kiểm tra phân bổ kho FEFO và ghi nhận tiền COD.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError("");
            setRefreshKey((value) => value + 1);
          }}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2 text-sm font-bold text-[#00450d] hover:bg-[#f2f4f2] disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </header>

      <SalesOrderFilters
        status={status}
        paymentMethod={paymentMethod}
        onStatusChange={updateStatus}
        onPaymentMethodChange={updatePaymentMethod}
      />

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between text-sm text-[#5a6357]">
        <span>{meta.total} đơn hàng</span>
        <span>{loading ? "Đang tải..." : `Trang ${meta.current_page} / ${meta.last_page}`}</span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#c0c9bb]/40 bg-white py-14 text-center text-sm text-[#5a6357]">
          Đang tải danh sách đơn hàng...
        </div>
      ) : orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <SalesOrderCard
              key={order.order_id}
              order={order}
              busyAction={busyAction}
              onConfirm={(selectedOrder) =>
                runOrderAction(selectedOrder, "confirm", "Đơn hàng đã được phê duyệt.")
              }
              onConfirmCodPayment={(selectedOrder) =>
                runOrderAction(selectedOrder, "cod", "Đã ghi nhận thu tiền COD.")
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c0c9bb]/60 bg-white py-14 text-center text-sm text-[#5a6357]">
          Không tìm thấy đơn hàng phù hợp với bộ lọc.
        </div>
      )}

      <Pagination
        currentPage={meta.current_page}
        lastPage={meta.last_page}
        total={meta.total}
        perPage={meta.per_page}
        onPageChange={(nextPage) => {
          setLoading(true);
          setPage(nextPage);
        }}
        itemLabel="đơn hàng"
      />
    </div>
  );
}
