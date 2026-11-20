/* Retail checkout: server quote, address selection, order creation, and ApiPay. */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, PackageCheck, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
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
  const checkoutItems = quote?.items?.length
    ? quote.items.map((quoteItem) => ({
      ...(cartItems.find((item) => String(item.id) === String(quoteItem.id)) ?? {}),
      ...quoteItem,
    }))
    : cartItems;

  if (pageLoading) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-600" role="status">
        Đang tải thông tin thanh toán...
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Điều hướng trang" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-emerald-800">Trang Chủ</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-emerald-900">Giỏ Hàng &amp; Thanh Toán Đặt Hàng</span>
      </nav>

      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-[#15351d] sm:text-4xl">
            <ShoppingCart className="h-8 w-8 shrink-0 text-emerald-700" aria-hidden="true" />
            Giỏ Hàng &amp; Thanh Toán Đặt Hàng
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Giao hỏa tốc bằng thùng giữ lạnh chuyên dụng · Nông sản tươi sạch thu hoạch trong ngày
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/cart"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            Quay lại giỏ hàng
          </Link>
          <Link
            to="/products"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800"
          >
            ← Tiếp tục chọn nông sản
          </Link>
        </div>
      </header>

      {pendingOrderId && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span>
            Đơn hàng #{pendingOrderId} đang chờ thanh toán. Bạn có thể lấy lại liên kết thanh toán mà không tạo đơn mới.
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={checkOrderStatus}
              disabled={checkingStatus}
              className="min-h-11 rounded-lg border border-amber-300 px-3.5 py-2 font-semibold transition hover:bg-amber-100 disabled:opacity-50"
            >
              {checkingStatus ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
            </button>
            <button
              type="button"
              onClick={cancelPendingOrder}
              disabled={cancellingOrder}
              className="min-h-11 rounded-lg border border-red-300 px-3.5 py-2 font-semibold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
            >
              {cancellingOrder ? "Đang hủy..." : "Hủy đơn"}
            </button>
          </div>
        </div>
      )}
      {statusMessage && (
        <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          {statusMessage}
          <Link to="/orders" className="ml-2 font-bold underline">Xem đơn hàng</Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-6">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-extrabold text-emerald-900">
              <ShoppingBag className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              Danh Sách Nông Sản ({checkoutItems.length} mặt hàng)
            </h2>
            {pendingOrderId ? (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Đơn hàng #{pendingOrderId} đã được tạo. Hoàn tất thanh toán hoặc kiểm tra trạng thái đơn hàng ở phía trên.
              </p>
            ) : checkoutItems.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {checkoutItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-4 sm:gap-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-emerald-50 sm:h-20 sm:w-20">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-emerald-700">
                          <ShoppingBag className="h-7 w-7" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold leading-5 text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Đơn giá: {formatCurrencyVnd(item.unit_price ?? item.price)}/{item.unit || "đơn vị"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Số lượng: {item.quantity} {item.unit || ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-right font-extrabold text-slate-900">
                      {formatCurrencyVnd(item.line_total ?? (item.price * item.quantity))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">
                {quoteLoading ? "Đang tải danh sách sản phẩm..." : "Giỏ hàng chưa có sản phẩm."}
              </p>
            )}

            {!pendingOrderId && (
              <label className="mt-2 flex min-h-16 cursor-pointer items-center gap-3 border-t border-slate-100 pt-4">
                <input
                  type="checkbox"
                  checked={useRewardPoints}
                  onChange={(event) => handleUsePointsChange(event.target.checked)}
                  disabled={pointsLoading || pointsAvailable <= 0 || submitting || !addressId}
                  className="h-5 w-5 shrink-0 accent-emerald-800"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-900">Đổi điểm thưởng Loyalty</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {pointsLoading ? "Đang tải số dư..." : `Bạn có ${pointsAvailable.toLocaleString("vi-VN")} điểm khả dụng.`}
                  </span>
                </span>
                <span className="hidden text-sm font-bold text-emerald-800 sm:block">
                  {displayPointsDiscount > 0 ? `−${formatCurrencyVnd(displayPointsDiscount)}` : "Áp dụng điểm"}
                </span>
              </label>
            )}
          </section>

          {quoteLoading && !pendingOrderId && (
            <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600" role="status">
              Đang tính khoảng cách và phí giao hàng...
            </p>
          )}
          {quoteError && !pendingOrderId && (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
              {quoteError}
            </p>
          )}
        </div>

        <div className="space-y-5">
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
                <div className="-mt-3 rounded-b-2xl border border-t-0 border-slate-200 bg-white px-5 pb-4 pt-2 text-xs text-slate-600 sm:px-6">
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                    {quote.origin_name} đến địa chỉ nhận: {quote.distance_km} km
                  </p>
                  <p className="mt-1 pl-6">
                    Phí giao hàng {formatCurrencyVnd(quote.price_per_km)}/km
                  </p>
                </div>
              )}
              {addressEditor && (
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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
                        className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
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
                        className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
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
                              className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                            />
                          </label>
                        ))}
                        <p className="text-xs text-slate-500 sm:col-span-2">
                          Hệ thống sẽ định vị địa chỉ để tính phí giao hàng.
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveAddress}
                      disabled={savingAddress}
                      className="min-h-11 rounded-xl bg-[#0b4524] px-4 py-2 font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {savingAddress ? "Đang lưu..." : "Lưu địa chỉ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddressEditor("")}
                      disabled={savingAddress}
                      className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      Hủy
                    </button>
                  </div>
                </section>
              )}
              {addresses.length === 0 && (
                <p className="-mt-3 text-sm text-amber-800" role="status">Thêm địa chỉ giao hàng để tiếp tục.</p>
              )}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <fieldset>
                  <legend className="text-lg font-extrabold text-slate-900">Phương thức thanh toán</legend>
                  <div className="mt-4 space-y-3">
                    <label className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${paymentMethod === "ApiPay" ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600" : "border-slate-200 bg-white hover:border-emerald-200"}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="ApiPay"
                        checked={paymentMethod === "ApiPay"}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={submitting}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      <span className="flex-1 text-sm font-semibold text-slate-800">
                        <span className="block">Chuyển khoản trực tuyến ApiPay</span>
                        <span className="mt-1 block text-xs font-normal text-slate-500">Quét mã hoặc mở liên kết để thanh toán an toàn.</span>
                      </span>
                    </label>
                    <label className={`flex min-h-[72px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${paymentMethod === "COD" ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600" : "border-slate-200 bg-white hover:border-emerald-200"}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="COD"
                        checked={paymentMethod === "COD"}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        disabled={submitting}
                        className="h-4 w-4 accent-emerald-800"
                      />
                      <span className="flex-1 text-sm font-semibold text-slate-800">
                        <span className="block">Thanh toán khi nhận hàng (COD)</span>
                        <span className="mt-1 block text-xs font-normal text-slate-500">Kiểm tra nông sản trước khi thanh toán.</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
                <label htmlFor="order-note" className="mt-5 block text-sm font-semibold text-slate-700">
                  Ghi chú cho shipper (tùy chọn)
                  <textarea
                    id="order-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={2000}
                    rows={3}
                    disabled={submitting}
                    placeholder="Ví dụ: vui lòng gọi trước khi giao"
                    className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                  />
                </label>
              </section>
            </>
          )}

          {paymentMethod === "ApiPay" && !options?.ready && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook. Vui lòng liên hệ quản trị viên.
            </p>
          )}
          {payment && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm" aria-live="polite">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-emerald-950">
                <PackageCheck className="h-5 w-5" aria-hidden="true" />
                Đang chờ thanh toán
              </h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                Hoàn tất thanh toán tại ApiPay; đơn chỉ được xác nhận sau khi hệ thống nhận webhook hợp lệ.
              </p>
              {payment.qr_url && (
                <img
                  src={payment.qr_url}
                  alt="Mã QR thanh toán ApiPay"
                  className="mx-auto mt-4 h-48 w-48 rounded-xl border border-emerald-100 bg-white p-2"
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
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0b4524] px-5 py-3 font-bold text-white transition hover:bg-emerald-800"
              >
                Mở trang thanh toán ApiPay
              </a>
              {payment.expires_at && (
                <p className="mt-3 text-center text-xs text-emerald-900">
                  Liên kết hết hạn: {new Date(payment.expires_at).toLocaleString("vi-VN")}
                </p>
              )}
              <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                Thanh toán an toàn qua cổng ApiPay
              </p>
            </section>
          )}

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 sm:p-6">
            <h2 className="text-lg font-extrabold text-slate-900">Tóm tắt thanh toán</h2>
            <div className="mt-4 flex justify-between gap-4 text-sm text-slate-600">
              <span>Tạm tính ({checkoutItems.length} món)</span>
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
              <span className="text-lg font-extrabold text-emerald-900">
                {displayTotal === undefined ? "—" : formatCurrencyVnd(displayTotal)}
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Số tiền và tồn kho được kiểm tra lại ở máy chủ khi tạo đơn. Giỏ hàng chỉ bị xóa sau khi tạo đơn thành công.
            </p>
            <button
              type="submit"
              disabled={!canSubmit || (!pendingOrderId && cartItems.length === 0)}
              className="mt-5 min-h-12 w-full whitespace-nowrap rounded-xl bg-[#0b4524] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting
                ? "Đang xử lý..."
                : pendingOrderId
                  ? "Lấy lại liên kết"
                  : paymentMethod === "COD" ? "Xác nhận đặt hàng" : "Đặt hàng & thanh toán"}
            </button>
            <p className="mt-3 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
              Bảo mật thanh toán · Cam kết đổi mới hoặc hoàn tiền nếu rau bị dập nát
            </p>
          </aside>
        </div>
      </form>
    </section>
  );
}
