/* Registration, ApiPay checkout, and status recovery for recurring vegetable packages. */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { customerApi } from "../../services/customerApi";
import { storefrontApi } from "../../services/storefrontApi";
import SubscriptionScheduleForm from "../../components/customer/SubscriptionScheduleForm";

const SUBSCRIPTION_ID_KEY = "pending-subscription-id";
const IDEMPOTENCY_KEY = "pending-subscription-idempotency-key";

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
  const validationMessages = Object.values(error.fieldErrors ?? {}).flat();
  return validationMessages[0]
    || error.message
    || "Không thể xử lý đăng ký. Vui lòng thử lại.";
}

export default function SubscriptionRegisterPage() {
  const [searchParams] = useSearchParams();
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
    () => window.localStorage.getItem(SUBSCRIPTION_ID_KEY) ?? ""
  );
  const [payment, setPayment] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

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
  }, []);

  useEffect(() => {
    if (!subscriptionId) return undefined;
    let active = true;
    customerApi.getSubscriptionStatus(subscriptionId)
      .then((response) => {
        if (!active) return;
        const status = response.data;
        setSubscriptionStatus(status);
        if (status?.status === "Dang_hoat_dong") {
          window.localStorage.removeItem(SUBSCRIPTION_ID_KEY);
          window.localStorage.removeItem(IDEMPOTENCY_KEY);
          setSubscriptionId("");
          setPayment(null);
          setNotice("Thanh toán thành công. Gói rau định kỳ của bạn đã được kích hoạt.");
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 404) {
          window.localStorage.removeItem(SUBSCRIPTION_ID_KEY);
          window.localStorage.removeItem(IDEMPOTENCY_KEY);
          setSubscriptionId("");
          setPayment(null);
        }
        setErrorMessage(apiErrorMessage(error));
      });

    return () => {
      active = false;
    };
  }, [subscriptionId, statusRefresh]);

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
        // Reuse the key if a network failure left the create request outcome uncertain.
        let idempotencyKey = window.localStorage.getItem(IDEMPOTENCY_KEY);
        if (!idempotencyKey) {
          idempotencyKey = createIdempotencyKey();
          window.localStorage.setItem(IDEMPOTENCY_KEY, idempotencyKey);
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
        window.localStorage.setItem(SUBSCRIPTION_ID_KEY, id);
        window.localStorage.removeItem(IDEMPOTENCY_KEY);
        setSubscriptionId(id);
      }

      const checkout = await customerApi.checkoutSubscription(id);
      setPayment(checkout.data ?? null);
      setNotice("Đăng ký đã được lưu. Hoàn tất thanh toán để kích hoạt gói.");
    } catch (error) {
      if (error.status === 409) {
        window.localStorage.removeItem(IDEMPOTENCY_KEY);
      }
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (weekday) => {
    setDeliveryDays((current) => current.some((item) => item.weekday === weekday)
      ? current.filter((item) => item.weekday !== weekday)
      : [...current, { weekday, delivery_window: "08:00 - 10:00" }].sort((a, b) => a.weekday - b.weekday));
  };

  const changeWindow = (weekday, deliveryWindow) => {
    setDeliveryDays((current) => current.map((item) => (
      item.weekday === weekday ? { ...item, delivery_window: deliveryWindow } : item
    )));
  };

  const changeShippingAddress = (field, value) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  if (loading) {
    return <main className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-600">Đang tải thông tin gói rau...</main>;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">Nông sản sạch · Giao định kỳ</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Đăng ký gói rau định kỳ</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Chọn gói, địa chỉ và lịch giao hằng tuần. Đăng ký chỉ được kích hoạt sau khi ApiPay xác nhận thanh toán.
        </p>
      </header>

      {errorMessage && (
        <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      {subscriptionId ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">Đăng ký #{subscriptionId} đang chờ thanh toán</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gói chưa được kích hoạt cho đến khi hệ thống nhận được xác nhận thanh toán.
            </p>
            {subscriptionStatus && (
              <p className="mt-2 text-sm text-slate-700">
                Trạng thái: {subscriptionStatus.status} · Thanh toán: {subscriptionStatus.payment_status ?? "Chưa khởi tạo"}
              </p>
            )}
          </div>
          {payment?.pay_url && (
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="font-bold text-emerald-950">Hoàn tất thanh toán ApiPay</p>
              {payment.qr_url && (
                <img
                  src={payment.qr_url}
                  alt="Mã QR thanh toán ApiPay"
                  className="mx-auto mt-4 h-48 w-48 rounded-lg bg-white object-contain p-2"
                />
              )}
              <a
                href={payment.pay_url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-emerald-800 px-4 py-3 font-bold text-white hover:bg-emerald-700 sm:w-auto"
              >
                Mở trang thanh toán ApiPay
              </a>
              {payment.expires_at && (
                <p className="mt-2 text-xs text-slate-600">Liên kết hết hạn: {payment.expires_at}</p>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => startPayment(subscriptionId)}
              disabled={isSubmitting || !bankConfigured}
              className="min-h-11 rounded-xl border border-emerald-800 px-4 py-2 font-bold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Đang xử lý..." : payment ? "Lấy lại liên kết thanh toán" : "Tiếp tục thanh toán"}
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                setStatusRefresh((current) => current + 1);
              }}
              disabled={isSubmitting}
              className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 font-bold text-slate-800 hover:bg-slate-50"
            >
              Kiểm tra trạng thái thanh toán
            </button>
          </div>
        </section>
      ) : packages.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-700">
          Hiện chưa có gói rau định kỳ đang mở bán.
        </p>
      ) : (
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
          onShippingAddressChange={changeShippingAddress}
          onStartDateChange={setStartDate}
          onToggleDay={toggleDay}
          onWindowChange={changeWindow}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          apiPayReady={apiPayReady}
        />
      )}

      <p className="mt-8 text-sm text-slate-600">
        Cần chọn sản phẩm khác? <Link to="/products" className="font-bold text-emerald-800 underline">Quay lại cửa hàng</Link>
      </p>
    </main>
  );
}
