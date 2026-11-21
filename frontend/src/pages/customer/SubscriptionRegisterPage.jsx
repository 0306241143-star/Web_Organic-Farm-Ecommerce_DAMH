/* ==========================================================================
 * TRANG ĐĂNG KÝ GÓI RAU CỦ ĐỊNH KỲ (SUBSCRIPTION REGISTER PAGE)
 * ========================================================================== */
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { storefrontApi } from "../../services/storefrontApi";
import SubscriptionScheduleForm from "../../components/customer/SubscriptionScheduleForm";

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createIdempotencyKey() {
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
  return (
    validationMessages[0] ||
    error.message ||
    error.response?.data?.message ||
    "Không thể xử lý đăng ký. Vui lòng thử lại."
  );
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
  const [subscriptionId, setSubscriptionId] = useState(() =>
    subscriptionStorageKey ? window.localStorage.getItem(subscriptionStorageKey) ?? "" : ""
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
        const addressList = addressResponse.data?.data ?? addressResponse.data ?? [];
        const optionsData = optionsResponse.data?.data ?? optionsResponse.data ?? {};
        setPackages(availablePackages);
        setAddresses(addressList);
        setAddressMode(addressList.length > 0 ? "saved" : "new");
        setAddressId(String(addressList.find((address) => address.is_default)?.id ?? addressList[0]?.id ?? ""));
        setApiPayReady(Boolean(optionsResponse.data?.ready));

        const productPackage = selectedProduct
          ? availablePackages.find((item) =>
              item.items?.some(
                (packageItem) => String(packageItem.product_id) === String(selectedProduct.id)
              )
            )
          : null;
        setPackageId(
          (current) => current || String(productPackage?.id ?? searchParams.get("package_id") ?? "")
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
    customerApi
      .getSubscriptionStatus(subscriptionId)
      .then((response) => {
        if (!active) return;
        const status = response.data?.data ?? response.data;
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
      setPayment(response.data?.data ?? response.data ?? null);
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
        const regData = registration.data?.data ?? registration.data ?? {};
        id = String(regData.subscription_id ?? "");
        if (!id) throw new Error("Máy chủ chưa trả về mã đăng ký.");
        if (subscriptionStorageKey) window.localStorage.setItem(subscriptionStorageKey, id);
        if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
        setSubscriptionId(id);
      }

      const checkout = await customerApi.checkoutSubscription(id);
      setPayment(checkout.data?.data ?? checkout.data ?? null);
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
        : [...current, { weekday, delivery_window: "08:00 - 10:00" }].sort(
            (left, right) => left.weekday - right.weekday
          );
    });
  };

  const changeWindow = (weekday, deliveryWindow) => {
    setDeliveryDays((current) =>
      current.map((item) =>
        item.weekday === weekday ? { ...item, delivery_window: deliveryWindow } : item
      )
    );
  };

  const handleShippingAddressChange = (field, value) => {
    setShippingAddress((current) => ({ ...current, [field]: value }));
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center text-slate-600">
        Đang tải thông tin gói rau...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-sm font-bold uppercase tracking-wide text-emerald-800">
          Nông sản sạch · Giao định kỳ
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Đăng ký gói rau định kỳ</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Chọn gói, địa chỉ và lịch giao hằng tuần. Đăng ký chỉ được kích hoạt sau khi ApiPay xác
          nhận thanh toán.
        </p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}

      {subscriptionId ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div>
            <h2 className="text-xl font-extrabold text-slate-950">
              Đăng ký #{subscriptionId} đang chờ thanh toán
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Gói chưa được kích hoạt cho đến khi hệ thống nhận được xác nhận thanh toán.
            </p>
            {subscriptionStatus && (
              <p className="mt-2 text-sm text-slate-700">
                Trạng thái: {subscriptionStatus.status} · Thanh toán:{" "}
                {subscriptionStatus.payment_status ?? "Chưa khởi tạo"}
              </p>
            )}
          </div>
          {paymentUrl && (
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
                href={paymentUrl}
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
              disabled={isSubmitting || !apiPayReady}
              className="min-h-11 rounded-xl border border-emerald-800 px-4 py-2 font-bold text-emerald-900 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting
                ? "Đang xử lý..."
                : payment
                ? "Lấy lại liên kết thanh toán"
                : "Tiếp tục thanh toán"}
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
          onAddressModeChange={setAddressMode}
          packageId={packageId}
          onPackageChange={setPackageId}
          addressId={addressId}
          onAddressChange={setAddressId}
          shippingAddress={shippingAddress}
          onShippingAddressChange={handleShippingAddressChange}
          startDate={startDate}
          minStartDate={minStartDate}
          onStartDateChange={setStartDate}
          deliveryDays={deliveryDays}
          onToggleDay={toggleDay}
          onWindowChange={changeWindow}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          apiPayReady={apiPayReady}
          bankConfigured={apiPayReady}
        />
      )}

      <p className="mt-8 text-sm text-slate-600">
        Cần chọn sản phẩm khác?{" "}
        <Link to="/products" className="font-bold text-emerald-800 underline">
          Quay lại cửa hàng
        </Link>
      </p>
    </main>
  );
}