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
  const [addressEditor, setAddressEditor] = useState("");
  const [addressDraft, setAddressDraft] = useState({
    recipient_name: "",
    phone: "",
    street: "",
    ward: "",
    district: "",
    province: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [quote, setQuote] = useState(null);
  const [options, setOptions] = useState(null);
  const [pointsAvailable, setPointsAvailable] = useState(0);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [useRewardPoints, setUseRewardPoints] = useState(false);
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
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [payment, setPayment] = useState(null);
  const pendingOrderKey = user?.id ? `xanhfarm:pendingRetailOrder:${user.id}` : null;
  const quoteRequest = useRef(0);

  const loadQuote = useCallback((selectedAddressId, pointsToUse = 0) => {
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
    customerApi.getCheckoutQuote({
      address_id: Number(selectedAddressId),
      points_to_use: pointsToUse,
    })
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
        customerApi.getRewardPoints()
          .then((rewardResponse) => setPointsAvailable(Number(rewardResponse.data?.points_available ?? 0)))
          .catch((requestError) => notifyApiErrorToast(requestError, "Không thể làm mới số dư điểm."));
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

  const cancelPendingOrder = async () => {
    if (!pendingOrderId || cancellingOrder) return;
    setCancellingOrder(true);
    try {
      const response = await customerApi.cancelRetailOrder(pendingOrderId);
      if (pendingOrderKey) localStorage.removeItem(pendingOrderKey);
      setPendingOrderId("");
      setPayment(null);
      setStatusMessage(
        response.data?.points_refunded
          ? `Đã hủy đơn hàng. ${response.data.points_refunded} điểm thưởng đã được hoàn lại.`
          : "Đã hủy đơn hàng."
      );
      const rewardResponse = await customerApi.getRewardPoints();
      setPointsAvailable(Number(rewardResponse.data?.points_available ?? 0));
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể hủy đơn hàng.");
    } finally {
      setCancellingOrder(false);
    }
  };

  useEffect(() => {
    let active = true;

    Promise.all([
      customerApi.getAddresses(),
      customerApi.getCheckoutOptions(),
      customerApi.getRewardPoints(),
    ])
      .then(([addressResponse, optionsResponse, rewardResponse]) => {
        if (!active) return;
        setAddresses(addressResponse.data || []);
        setOptions(optionsResponse.data || {});
        const availablePoints = Number(rewardResponse.data?.points_available ?? 0);
        setPointsAvailable(availablePoints);
        const defaultAddress = addressResponse.data?.find((address) => address.is_default)
          || addressResponse.data?.[0];
        if (defaultAddress) {
          setAddressId(String(defaultAddress.id));
          loadQuote(defaultAddress.id, 0);
        }
      })
      .catch((requestError) => {
        if (active) notifyApiErrorToast(requestError, "Không thể tải thông tin thanh toán.");
      })
      .finally(() => {
        if (active) {
          setPageLoading(false);
          setPointsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadQuote]);

  const handleAddressChange = (nextAddressId) => {
    setAddressId(nextAddressId);
    loadQuote(nextAddressId, useRewardPoints ? pointsAvailable : 0);
  };

  const beginAddressEdit = (address) => {
    setAddressError("");
    setAddressDraft({
      recipient_name: address.recipient_name,
      phone: address.phone,
      street: address.street,
      ward: address.ward,
      district: address.district,
      province: address.province,
    });
    setAddressEditor("edit");
  };

  const beginAddressCreate = () => {
    setAddressError("");
    setAddressDraft({
      recipient_name: user?.name ?? "",
      phone: "",
      street: "",
      ward: "",
      district: "",
      province: "",
    });
    setAddressEditor("create");
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    if (savingAddress) return;
    setSavingAddress(true);
    setAddressError("");
    try {
      const payload = addressEditor === "edit"
        ? {
          recipient_name: addressDraft.recipient_name,
          phone: addressDraft.phone,
        }
        : addressDraft;
      const response = addressEditor === "edit"
        ? await customerApi.updateAddress(addressId, payload)
        : await customerApi.createAddress(payload);
      const savedAddress = response.data;
      const listResponse = await customerApi.getAddresses();
      const nextAddresses = listResponse.data ?? [];
      setAddresses(nextAddresses);
      setAddressId(String(savedAddress.id));
      setAddressEditor("");
      loadQuote(savedAddress.id, useRewardPoints ? pointsAvailable : 0);
    } catch (requestError) {
      setAddressError(requestError.message || "Không thể lưu địa chỉ.");
      notifyApiErrorToast(requestError, "Không thể lưu địa chỉ.");
    } finally {
      setSavingAddress(false);
    }
  };

  const changeAddressDraft = (field, value) => {
    setAddressDraft((current) => ({ ...current, [field]: value }));
  };

  const handleUsePointsChange = (enabled) => {
    setUseRewardPoints(enabled);
    loadQuote(addressId, enabled ? pointsAvailable : 0);
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
          points_to_use: useRewardPoints ? Number(quote?.points_to_use ?? pointsAvailable) : 0,
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

        setQuote(null);
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
  const displayPointsDiscount = quote?.points_discount ?? order?.points_discount ?? 0;
  const selectedAddress = addresses.find((address) => String(address.id) === String(addressId));

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
        <Link to="/cart" className="mb-4 inline-flex min-h-10 items-center font-semibold text-emerald-800 hover:underline">
          ← Quay lại giỏ hàng
        </Link>
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
          <button
            type="button"
            onClick={cancelPendingOrder}
            disabled={cancellingOrder}
            className="min-h-[44px] rounded-lg border border-red-300 px-3.5 py-2 font-semibold text-red-800 disabled:opacity-50"
          >
            {cancellingOrder ? "Đang hủy..." : "Hủy đơn"}
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
                onAddAddress={beginAddressCreate}
                onEditAddress={beginAddressEdit}
                disabled={submitting}
              />
              {selectedAddress && quote && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
                  <p>{quote.origin_name} đến địa chỉ nhận: {quote.distance_km} km</p>
                  <p className="mt-1">Phí giao hàng {formatCurrencyVnd(quote.price_per_km)}/km</p>
                </div>
              )}
              {addressEditor && (
                <section className="rounded-2xl border border-emerald-200 bg-white p-5">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {addressEditor === "edit" ? "Sửa người nhận" : "Thêm địa chỉ giao hàng"}
                  </h2>
                  {addressError && <p role="alert" className="mt-3 text-sm text-red-700">{addressError}</p>}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Tên người nhận
                      <input
                        value={addressDraft.recipient_name}
                        onChange={(event) => changeAddressDraft("recipient_name", event.target.value)}
                        maxLength={150}
                        required
                        disabled={savingAddress}
                        className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
                      />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">
                      Số điện thoại
                      <input
                        type="tel"
                        value={addressDraft.phone}
                        onChange={(event) => changeAddressDraft("phone", event.target.value)}
                        pattern="(?:[+]84|0)[0-9]{9,10}"
                        title="Nhập số điện thoại Việt Nam, ví dụ 0912345678"
                        maxLength={13}
                        required
                        disabled={savingAddress}
                        className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
                      />
                    </label>
                    {addressEditor === "create" && (
                      <>
                        {[
                          ["street", "Số nhà, tên đường"],
                          ["ward", "Phường / xã"],
                          ["district", "Quận / huyện"],
                          ["province", "Tỉnh / thành phố"],
                        ].map(([field, label]) => (
                          <label key={field} className="text-sm font-semibold text-slate-700">
                            {label}
                            <input
                              value={addressDraft[field]}
                              onChange={(event) => changeAddressDraft(field, event.target.value)}
                              maxLength={field === "street" ? 255 : 100}
                              required
                              disabled={savingAddress}
                              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 font-normal"
                            />
                          </label>
                        ))}
                        <p className="text-xs text-slate-500 sm:col-span-2">
                          Hệ thống sẽ định vị địa chỉ để tính phí giao hàng.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={saveAddress}
                      disabled={savingAddress}
                      className="min-h-11 rounded-lg bg-emerald-800 px-4 py-2 font-bold text-white disabled:opacity-50"
                    >
                      {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressEditor("")}
                      disabled={savingAddress}
                      className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
                    >
                      Hủy
                    </button>
                  </div>
                </section>
              )}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={useRewardPoints}
                    onChange={(event) => handleUsePointsChange(event.target.checked)}
                    disabled={pointsLoading || pointsAvailable <= 0 || submitting || !addressId}
                    className="mt-1 h-4 w-4 accent-emerald-800"
                  />
                  <span>
                    <span className="block font-bold text-slate-900">Sử dụng điểm thưởng</span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {pointsLoading ? "Đang tải số dư..." : `Bạn có ${pointsAvailable.toLocaleString("vi-VN")} điểm khả dụng.`}
                    </span>
                  </span>
                </label>
              </section>
              {addresses.length === 0 && (
                <p className="text-sm text-amber-800" role="status">Thêm địa chỉ giao hàng để tiếp tục.</p>
              )}
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <fieldset>
                  <legend className="text-lg font-extrabold text-slate-900">
                    Phương thức thanh toán
                  </legend>
                  <div className="mt-3 space-y-2">
                    <label className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${paymentMethod === "ApiPay" ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700" : "border-slate-200 bg-white"}`}>
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
                        <span className="block">Chuyển khoản trực tuyến ApiPay</span>
                        <span className="mt-1 block text-xs font-normal text-slate-600">Quét mã hoặc mở liên kết để thanh toán an toàn.</span>
                      </span>
                    </label>
                    <label className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors ${paymentMethod === "COD" ? "border-emerald-700 bg-emerald-50 ring-1 ring-emerald-700" : "border-slate-200 bg-white"}`}>
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
                        <span className="block">Thanh toán khi nhận hàng (COD)</span>
                        <span className="mt-1 block text-xs font-normal text-slate-600">Thanh toán trực tiếp khi nhận được đơn.</span>
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
                  <span className="text-slate-600">
                    <span className="block">{item.name} × {item.quantity} {item.unit}</span>
                    <span className="mt-1 block text-xs text-slate-500">{formatCurrencyVnd(item.unit_price)}/{item.unit}</span>
                  </span>
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
          <div className="mt-3 flex justify-between gap-4 text-sm text-emerald-800">
            <span>Giảm từ điểm thưởng{quote?.points_to_use ? ` (${quote.points_to_use} điểm)` : ""}</span>
            <span className="font-bold">
              {displayPointsDiscount > 0 ? `−${formatCurrencyVnd(displayPointsDiscount)}` : formatCurrencyVnd(0)}
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
            className="mt-5 w-full whitespace-nowrap rounded-xl bg-emerald-800 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting
              ? "Đang xử lý..."
              : pendingOrderId
                ? "Lấy lại liên kết"
                : paymentMethod === "COD" ? "Đặt hàng" : "Đặt hàng & thanh toán"}
          </button>
          <Link to="/cart" className="mt-4 block text-center text-sm font-semibold text-emerald-800 hover:underline">
            Quay lại giỏ hàng
          </Link>
        </aside>
      </form>
    </section>
  );
}
