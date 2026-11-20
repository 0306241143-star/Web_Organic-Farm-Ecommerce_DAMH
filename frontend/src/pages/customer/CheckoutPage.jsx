/* Retail checkout: server quote, address selection, order creation, and ApiPay. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AddressDistancePicker from "../../components/customer/AddressDistancePicker";
import { useAuth } from "../../context/useAuth";
import { useCart } from "../../context/useCart";
import { customerApi } from "../../services/customerApi";
import { formatCurrencyVnd } from "../../services/publicApi";
import { notifyApiErrorToast } from "../../services/axiosClient";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items: cartItems, refreshCart } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [quote, setQuote] = useState(null);
  const [options, setOptions] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("ApiPay");
  const [quoteError, setQuoteError] = useState("");
  const [pendingOrderId, setPendingOrderId] = useState(() => {
    const key = user?.id ? `xanhfarm:pendingRetailOrder:${user.id}` : null;
    return key ? localStorage.getItem(key) || "" : "";
  });
  const [order, setOrder] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [payment, setPayment] = useState(null);
  const pendingOrderKey = user?.id ? `xanhfarm:pendingRetailOrder:${user.id}` : null;
  const quoteRequest = useRef(0);

  const loadQuote = useCallback((selectedAddressId) => {
    const requestId = ++quoteRequest.current;
    if (!selectedAddressId) {
      setQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return;
    }

    setQuote(null);
    setQuoteError("");
    setQuoteLoading(true);
    customerApi.getCheckoutQuote({ address_id: Number(selectedAddressId) })
      .then((response) => {
        if (requestId === quoteRequest.current) setQuote(response.data);
      })
      .catch((requestError) => {
        if (requestId === quoteRequest.current) {
          setQuoteError(requestError.message || "Không thể tính phí giao hàng.");
        }
      })
      .finally(() => {
        if (requestId === quoteRequest.current) setQuoteLoading(false);
      });
  }, []);

  const checkOrderStatus = useCallback(async () => {
    if (!pendingOrderId) return;

    setCheckingStatus(true);
    try {
      const response = await customerApi.getRetailOrderStatus(pendingOrderId);
      const status = response.data.status;
      setOrderStatus(status);
      if (status !== "Cho_thanh_toan") {
        if (pendingOrderKey) localStorage.removeItem(pendingOrderKey);
        setPendingOrderId("");
        setPayment(null);
        setStatusMessage(status === "Da_huy"
          ? `Đơn hàng #${pendingOrderId} đã bị hủy. Bạn có thể đặt đơn mới.`
          : `Đơn hàng #${pendingOrderId} đã được thanh toán và đang được xử lý.`);
      }
    } catch (requestError) {
      if (requestError.status === 404) {
        if (pendingOrderKey) localStorage.removeItem(pendingOrderKey);
        setPendingOrderId("");
        setStatusMessage("Không tìm thấy đơn chờ thanh toán. Bạn có thể tạo đơn mới.");
      } else {
        notifyApiErrorToast(requestError, "Không thể kiểm tra trạng thái đơn hàng.");
      }
    } finally {
      setCheckingStatus(false);
    }
  }, [pendingOrderId, pendingOrderKey]);

  useEffect(() => {
    let active = true;

    Promise.all([
      customerApi.getAddresses(),
      customerApi.getCheckoutOptions(),
    ])
      .then(([addressResponse, optionsResponse]) => {
        if (!active) return;
        setAddresses(addressResponse.data || []);
        setOptions(optionsResponse.data || {});
        const defaultAddress = addressResponse.data?.find((address) => address.is_default)
          || addressResponse.data?.[0];
        if (defaultAddress) {
          setAddressId(String(defaultAddress.id));
          loadQuote(defaultAddress.id);
        }
      })
      .catch((requestError) => {
        if (active) notifyApiErrorToast(requestError, "Không thể tải thông tin thanh toán.");
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadQuote]);

  const handleAddressChange = (nextAddressId) => {
    setAddressId(nextAddressId);
    loadQuote(nextAddressId);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setPayment(null);
    try {
      let orderId = pendingOrderId;
      if (!orderId) {
        const orderResponse = await customerApi.createRetailOrder({
          address_id: Number(addressId),
          payment_method: paymentMethod,
          note: note.trim() || undefined,
        });
        const createdOrder = orderResponse.data;
        orderId = String(createdOrder.order_id);
        refreshCart().catch((refreshError) =>
          notifyApiErrorToast(refreshError, "Không thể làm mới giỏ hàng.")
        );
        if (paymentMethod === "COD") {
          navigate("/orders", { replace: true });
          return;
        }

        setOrder(createdOrder);
        setPendingOrderId(orderId);
        if (pendingOrderKey) localStorage.setItem(pendingOrderKey, orderId);
      }

      const paymentResponse = await customerApi.checkout({ order_id: Number(orderId) });
      setPayment(paymentResponse.data);
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể tạo đơn hoặc khởi tạo thanh toán.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = (paymentMethod === "COD" || options?.ready) && !submitting && (
    pendingOrderId || (addressId && quote && !quoteLoading)
  );
  const displaySubtotal = quote?.subtotal ?? order?.subtotal;
  const displayShippingFee = quote?.shipping_fee ?? order?.shipping_fee;
  const displayTotal = quote?.total ?? order?.total;

  if (pageLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-600" role="status">
        Đang tải thông tin thanh toán...
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">XanhFarm</p>
        <h1 className="mt-1 text-3xl font-extrabold text-[#15351d]">Đặt mua lẻ & thanh toán</h1>
        <p className="mt-2 text-sm text-slate-600">
          Kiểm tra địa chỉ và chi phí giao hàng trước khi thanh toán trực tuyến.
        </p>
      </div>

      {pendingOrderId && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            Đơn hàng #{pendingOrderId} đang chờ thanh toán. Bạn có thể lấy lại liên kết thanh toán mà không tạo đơn mới.
          </span>
          <button
            type="button"
            onClick={checkOrderStatus}
            disabled={checkingStatus}
            className="min-h-[44px] rounded-lg border border-amber-300 px-3.5 py-2 font-semibold disabled:opacity-50"
          >
            {checkingStatus ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
          </button>
        </div>
      )}
      {statusMessage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          {statusMessage}
          <Link to="/orders" className="ml-2 font-bold underline">Xem đơn hàng</Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {!pendingOrderId && (
            <>
              <AddressDistancePicker
                addresses={addresses}
                value={addressId}
                onChange={handleAddressChange}
                disabled={submitting}
              />
              {addresses.length === 0 && (
                <Link to="/cart" className="inline-flex font-semibold text-emerald-800 underline">
                  Quay lại giỏ hàng
                </Link>
              )}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <fieldset>
                  <legend className="text-lg font-extrabold text-slate-900">
                    Phương thức thanh toán
                  </legend>
                  <div className="mt-3 space-y-2">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                      <input
                        type="radio"
                        name="payment_method"
                        value="ApiPay"
                        checked={paymentMethod === "ApiPay"}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={submitting}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Chuyển khoản trực tuyến ApiPay
                      </span>
                    </label>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                      <input
                        type="radio"
                        name="payment_method"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={submitting}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      <span className="text-sm font-semibold text-slate-800">
                        Thanh toán khi nhận hàng (COD)
                      </span>
                    </label>
                  </div>
                </fieldset>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <label htmlFor="order-note" className="block text-lg font-extrabold text-slate-900">
                  Ghi chú giao hàng
                </label>
                <textarea
                  id="order-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  rows={3}
                  disabled={submitting}
                  placeholder="Ví dụ: vui lòng gọi trước khi giao"
                  className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                />
              </section>
            </>
          )}

          {quoteLoading && !pendingOrderId && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-600" role="status">
              Đang tính khoảng cách và phí giao hàng...
            </p>
          )}
          {quoteError && !pendingOrderId && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              {quoteError}
            </p>
          )}
          {!pendingOrderId && quote && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-extrabold text-slate-900">Khoảng cách giao hàng</h2>
              <p className="mt-2 text-sm text-slate-600">
                {quote.origin_name} đến địa chỉ nhận: {quote.distance_km} km
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Đơn giá {formatCurrencyVnd(quote.price_per_km)}/km
              </p>
            </section>
          )}

          {paymentMethod === "ApiPay" && !options?.ready && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook. Vui lòng liên hệ quản trị viên.
            </p>
          )}
          {payment && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
              <h2 className="text-lg font-extrabold text-emerald-950">Đang chờ thanh toán</h2>
              <p className="mt-1 text-sm text-emerald-900">
                Hoàn tất thanh toán tại ApiPay; đơn chỉ được xác nhận sau khi hệ thống nhận webhook hợp lệ.
              </p>
              {payment.qr_url && (
                <img
                  src={payment.qr_url}
                  alt="Mã QR thanh toán ApiPay"
                  className="mx-auto mt-4 h-56 w-56 rounded-xl border border-emerald-100 bg-white p-2"
                />
              )}
              {orderStatus === "Cho_thanh_toan" && pendingOrderId && (
                <p className="mt-4 text-xs text-amber-800" role="status">
                  Hệ thống chưa nhận xác nhận thanh toán. Nếu bạn vừa thanh toán, hãy kiểm tra lại sau.
                </p>
              )}
              <a
                href={payment.pay_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex w-full justify-center rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700"
              >
                Mở trang thanh toán ApiPay
              </a>
              {payment.expires_at && (
                <p className="mt-3 text-center text-xs text-emerald-900">
                  Liên kết hết hạn: {new Date(payment.expires_at).toLocaleString("vi-VN")}
                </p>
              )}
            </section>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-extrabold text-slate-900">Tóm tắt thanh toán</h2>
          {quote?.items?.length > 0 && !pendingOrderId && (
            <ul className="mt-4 space-y-3 border-b border-slate-100 pb-4">
              {quote.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-600">{item.name} × {item.quantity} {item.unit}</span>
                  <span className="shrink-0 font-semibold text-slate-900">
                    {formatCurrencyVnd(item.line_total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-between gap-4 text-sm text-slate-600">
            <span>Tiền hàng</span>
            <span className="font-bold text-slate-900">
              {displaySubtotal === undefined ? "—" : formatCurrencyVnd(displaySubtotal)}
            </span>
          </div>
          <div className="mt-3 flex justify-between gap-4 text-sm text-slate-600">
            <span>Phí giao hàng{quote ? ` (${quote.distance_km} km)` : ""}</span>
            <span className="font-bold text-slate-900">
              {displayShippingFee === undefined ? "—" : formatCurrencyVnd(displayShippingFee)}
            </span>
          </div>
          <div className="mt-4 flex justify-between gap-4 border-t border-slate-100 pt-4">
            <span className="font-extrabold text-slate-900">Tổng thanh toán</span>
            <span className="font-extrabold text-emerald-900">
              {displayTotal === undefined ? "—" : formatCurrencyVnd(displayTotal)}
            </span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Số tiền và tồn kho được kiểm tra lại ở máy chủ khi tạo đơn. Giỏ hàng chỉ bị xóa sau khi tạo đơn thành công.
          </p>
          <button
            type="submit"
            disabled={!canSubmit || (!pendingOrderId && cartItems.length === 0)}
            className="mt-5 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Đang xử lý..."
              : pendingOrderId
                ? "Lấy lại liên kết thanh toán"
                : paymentMethod === "COD"
                  ? "Đặt hàng — thanh toán khi nhận hàng"
                  : `Đặt hàng & thanh toán qua ${options?.bank_name || "ApiPay"}`}
          </button>
          <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-emerald-800 hover:underline">
            Quay lại giỏ hàng
          </Link>
        </aside>
      </form>
    </section>
  );
}
