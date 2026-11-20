/* Registration and payment for recurring vegetable packages. */
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { storefrontApi } from "../../services/storefrontApi";
import SubscriptionScheduleForm from "../../components/customer/SubscriptionScheduleForm";

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function apiErrorMessage(error) {
  const validationMessages = Object.values(
    error.fieldErrors ?? error.response?.data?.errors ?? {}
  ).flat();
  return validationMessages[0]
    || error.message
    || error.response?.data?.message
    || "Không thể xử lý đăng ký. Vui lòng thử lại.";
}

export default function SubscriptionRegisterPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedProduct = location.state?.product;
  const subscriptionStorageKey = user?.id
    ? `xanhfarm:pendingSubscription:${user.id}`
    : null;
  const idempotencyStorageKey = user?.id
    ? `xanhfarm:pendingSubscriptionIdempotency:${user.id}`
    : null;

  const [packages, setPackages] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState("new");
  const [packageId, setPackageId] = useState(searchParams.get("package_id") ?? "");
  const [addressId, setAddressId] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    recipient_name: "",
    phone: "",
    street: "",
    ward: "",
    district: "",
    province: "",
  });
  const [startDate, setStartDate] = useState(() => localDateString());
  const [minStartDate] = useState(() => localDateString());
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [apiPayReady, setApiPayReady] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState(
    () => (subscriptionStorageKey ? window.localStorage.getItem(subscriptionStorageKey) ?? "" : "")
  );
  const [payment, setPayment] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const paymentUrl = payment?.pay_url || payment?.payment_url;

  useEffect(() => {
    let active = true;
    Promise.all([
      storefrontApi.getSubscriptions(),
      customerApi.getAddresses(),
      customerApi.getCheckoutOptions(),
    ])
      .then(([availablePackages, addressResponse, optionsResponse]) => {
        if (!active) return;
        const addressList = addressResponse.data ?? [];
        setPackages(availablePackages);
        setAddresses(addressList);
        setAddressMode(addressList.length > 0 ? "saved" : "new");
        setAddressId(String(addressList.find((address) => address.is_default)?.id ?? addressList[0]?.id ?? ""));
        setApiPayReady(Boolean(optionsResponse.data?.ready));

        const productPackage = selectedProduct
          ? availablePackages.find((item) =>
              item.items?.some(
                (packageItem) =>
                  String(packageItem.product_id) === String(selectedProduct.id)
              )
            )
          : null;
        setPackageId((current) =>
          current || String(productPackage?.id ?? searchParams.get("package_id") ?? "")
        );
      })
      .catch((error) => {
        if (active) setErrorMessage(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [searchParams, selectedProduct]);

  useEffect(() => {
    if (!subscriptionId) return undefined;
    let active = true;
    customerApi.getSubscriptionStatus(subscriptionId)
      .then((response) => {
        if (!active) return;
        const status = response.data;
        setSubscriptionStatus(status);
        if (status?.status === "Dang_hoat_dong") {
          if (subscriptionStorageKey) window.localStorage.removeItem(subscriptionStorageKey);
          if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
          setSubscriptionId("");
          setPayment(null);
          setNotice("Thanh toán thành công. Gói rau định kỳ của bạn đã được kích hoạt.");
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 404) {
          if (subscriptionStorageKey) window.localStorage.removeItem(subscriptionStorageKey);
          if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
          setSubscriptionId("");
          setPayment(null);
        }
        setErrorMessage(apiErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [subscriptionId, statusRefresh, subscriptionStorageKey, idempotencyStorageKey]);

  const startPayment = async (id) => {
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const response = await customerApi.checkoutSubscription(id);
      setPayment(response.data ?? null);
      setNotice("Đăng ký đã được lưu. Hoàn tất thanh toán để kích hoạt gói.");
    } catch (error) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    setIsSubmitting(true);

    try {
      let id = subscriptionId;
      if (!id) {
        let idempotencyKey = idempotencyStorageKey
          ? window.localStorage.getItem(idempotencyStorageKey)
          : null;
        if (!idempotencyKey) {
          idempotencyKey = createIdempotencyKey();
          if (idempotencyStorageKey) {
            window.localStorage.setItem(idempotencyStorageKey, idempotencyKey);
          }
        }

        const registration = await customerApi.createSubscription({
          package_id: Number(packageId),
          ...(addressMode === "saved"
            ? { address_id: Number(addressId) }
            : { shipping_address: shippingAddress }),
          start_date: startDate,
          delivery_days: deliveryDays,
          idempotency_key: idempotencyKey,
        });
        id = String(registration.data?.subscription_id ?? "");
        if (!id) throw new Error("Máy chủ chưa trả về mã đăng ký.");
        if (subscriptionStorageKey) window.localStorage.setItem(subscriptionStorageKey, id);
        if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
        setSubscriptionId(id);
      }

      const checkout = await customerApi.checkoutSubscription(id);
      setPayment(checkout.data ?? null);
      setNotice("Đăng ký đã được lưu. Hoàn tất thanh toán để kích hoạt gói.");
    } catch (error) {
      if (error.status === 409 && idempotencyStorageKey) {
        window.localStorage.removeItem(idempotencyStorageKey);
      }
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (weekday) => {
    setDeliveryDays((current) => {
      const existing = current.some((item) => item.weekday === weekday);
      return existing
        ? current.filter((item) => item.weekday !== weekday)
        : [...current, { weekday, delivery_window: "08:00 - 10:00" }]
            .sort((left, right) => left.weekday - right.weekday);
    });
  };

  const changeWindow = (weekday, deliveryWindow) => {
    setDeliveryDays((current) =>
      current.map((item) =>
        item.weekday === weekday
          ? { ...item, delivery_window: deliveryWindow }
          : item
      )
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <Link to="/products" className="text-sm font-bold text-emerald-800 underline">
        ← Cửa hàng
      </Link>
      <h1 className="mt-4 text-2xl font-extrabold text-[#00450d]">
        Đăng ký gói định kỳ
      </h1>

      {selectedProduct && (
        <section className="mt-5 rounded-2xl border border-[#c0c9bb]/40 bg-white p-5">
          <p className="text-sm text-[#5a6357]">Sản phẩm đang xem</p>
          <p className="mt-1 text-lg font-bold text-[#191c1b]">
            {selectedProduct.name}
          </p>
          <p className="mt-1 text-sm text-[#41493e]">
            {Number(selectedProduct.price).toLocaleString("vi-VN")}đ / {selectedProduct.unit}
          </p>
          <Link
            to={`/products/${selectedProduct.id}`}
            className="mt-3 inline-flex text-sm font-bold text-[#006e1c] hover:text-[#00450d]"
          >
            Quay lại chi tiết sản phẩm
          </Link>
        </section>
      )}

      {notice && (
        <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          {notice}
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          {errorMessage}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-center text-slate-600" role="status">
          Đang tải thông tin gói định kỳ...
        </p>
      ) : (
        <div className="mt-6">
          <SubscriptionScheduleForm
            packages={packages}
            addresses={addresses}
            addressMode={addressMode}
            packageId={packageId}
            addressId={addressId}
            shippingAddress={shippingAddress}
            startDate={startDate}
            minStartDate={minStartDate}
            deliveryDays={deliveryDays}
            onPackageChange={setPackageId}
            onAddressModeChange={setAddressMode}
            onAddressChange={setAddressId}
            onShippingAddressChange={(field, value) =>
              setShippingAddress((current) => ({ ...current, [field]: value }))
            }
            onStartDateChange={setStartDate}
            onToggleDay={toggleDay}
            onWindowChange={changeWindow}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            apiPayReady={apiPayReady}
          />
        </div>
      )}

      {payment && (
        <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5" aria-label="Thông tin thanh toán">
          <h2 className="text-lg font-extrabold text-emerald-950">
            Hoàn tất thanh toán
          </h2>
          {payment.qr_url && (
            <img
              src={payment.qr_url}
              alt="Mã QR thanh toán"
              className="mt-4 h-56 w-56 rounded-xl border border-slate-200 object-contain"
            />
          )}
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-700"
            >
              Mở trang thanh toán
            </a>
          )}
          {subscriptionId && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStatusRefresh((current) => current + 1)}
                className="min-h-11 rounded-xl border border-emerald-800 px-4 py-2 font-bold text-emerald-900"
              >
                Kiểm tra trạng thái
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => startPayment(subscriptionId)}
                className="min-h-11 rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white disabled:opacity-60"
              >
                Tạo lại yêu cầu thanh toán
              </button>
            </div>
          )}
        </section>
      )}

      {subscriptionId && subscriptionStatus?.status && (
        <p className="mt-4 text-sm text-slate-700" role="status">
          Trạng thái đăng ký: {subscriptionStatus.status}
        </p>
      )}
    </main>
  );
}
