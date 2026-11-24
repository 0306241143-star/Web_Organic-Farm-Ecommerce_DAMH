/* ==========================================================================
 * TRANG ĐĂNG KÝ GÓI RAU CỦ ĐỊNH KỲ (SUBSCRIPTION REGISTER PAGE)
 * ========================================================================== */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  Eye,
  PauseCircle,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sprout,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { storefrontApi } from "../../services/storefrontApi";
import SubscriptionScheduleForm from "../../components/customer/SubscriptionScheduleForm";
import { confirmGlobalDialog, showGlobalToast } from "../../components/GlobalToast";

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
  const isAdminPreview = user?.role === "admin";
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const selectedProduct = location.state?.product;
  const subscriptionStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscription:${user.id}` : null;
  const idempotencyStorageKey =
    !isAdminPreview && user?.id ? `xanhfarm:pendingSubscriptionIdempotency:${user.id}` : null;

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
    province: "TP. Hồ Chí Minh",
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
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const paymentUrl = payment?.pay_url || payment?.payment_url;

  const clearPendingSubscriptionStorage = useCallback(() => {
    if (subscriptionStorageKey) window.localStorage.removeItem(subscriptionStorageKey);
    if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
  }, [subscriptionStorageKey, idempotencyStorageKey]);

  useEffect(() => {
    let active = true;

    const loadData = isAdminPreview
      ? Promise.all([
          storefrontApi.getSubscriptions(),
          Promise.resolve({ data: { data: [] } }),
          Promise.resolve({ data: { ready: false } }),
        ])
      : Promise.all([
          storefrontApi.getSubscriptions(),
          customerApi.getAddresses(),
          customerApi.getCheckoutOptions(),
        ]);

    loadData
      .then(([availablePackages, addressResponse, optionsResponse]) => {
        if (!active) return;
        const addressList = addressResponse.data?.data ?? addressResponse.data ?? [];
        setPackages(availablePackages);
        setAddresses(addressList);
        setAddressMode(addressList.length > 0 ? "saved" : "new");
        setAddressId(
          String(
            addressList.find((address) => address.is_default)?.id ?? addressList[0]?.id ?? ""
          )
        );
        setApiPayReady(!isAdminPreview && Boolean(optionsResponse.data?.ready));

        const productPackage = selectedProduct
          ? availablePackages.find((item) =>
              item.items?.some(
                (packageItem) => String(packageItem.product_id) === String(selectedProduct.id)
              )
            )
          : null;
        setPackageId(
          (current) =>
            current ||
            String(
              productPackage?.id ??
                searchParams.get("package_id") ??
                availablePackages[0]?.id ??
                ""
            )
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
  }, [searchParams, selectedProduct, isAdminPreview]);

  useEffect(() => {
    if (!subscriptionId || isAdminPreview) return undefined;
    let active = true;
    customerApi
      .getSubscriptionStatus(subscriptionId)
      .then((response) => {
        if (!active) return;
        const status = response.data?.data ?? response.data;
        setSubscriptionStatus(status);
        if (status?.status === "Dang_hoat_dong") {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setNotice("Thanh toán thành công. Gói rau định kỳ của bạn đã được kích hoạt.");
        } else if (status?.status === "Da_huy" || status?.status === "Het_han") {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setSubscriptionStatus(null);
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 404) {
          clearPendingSubscriptionStorage();
          setSubscriptionId("");
          setPayment(null);
          setSubscriptionStatus(null);
        } else {
          setErrorMessage(apiErrorMessage(error));
        }
      });

    return () => {
      active = false;
    };
  }, [subscriptionId, statusRefresh, clearPendingSubscriptionStorage, isAdminPreview]);

  const startPayment = async (id) => {
    if (isAdminPreview) {
      showGlobalToast("Tài khoản Quản trị viên chỉ được xem trước, không thể thanh toán.", "warning");
      return;
    }
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

  const handleCancelSubscription = async () => {
    if (isAdminPreview || !subscriptionId || isCancelling) return;

    const confirmed = await confirmGlobalDialog({
      title: "Hủy đăng ký gói định kỳ?",
      message: `Bạn có chắc chắn muốn hủy đăng ký #${subscriptionId} đang chờ thanh toán không?`,
      confirmLabel: "Xác nhận hủy",
      variant: "danger",
    });
    if (!confirmed) return;

    setErrorMessage("");
    setIsCancelling(true);
    try {
      await customerApi.cancelSubscription(subscriptionId);
      clearPendingSubscriptionStorage();
      setSubscriptionId("");
      setPayment(null);
      setSubscriptionStatus(null);
      showGlobalToast("Đã hủy đăng ký gói định kỳ.", "info");
      setNotice("Đã hủy đăng ký gói định kỳ. Bạn có thể chọn gói mới bất kỳ lúc nào.");
    } catch (error) {
      if (error.status === 404) {
        clearPendingSubscriptionStorage();
        setSubscriptionId("");
        setPayment(null);
        setSubscriptionStatus(null);
      } else {
        setErrorMessage(apiErrorMessage(error));
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isAdminPreview) {
      showGlobalToast("Chế độ xem trước Admin: không cho phép đăng ký và thanh toán.", "warning");
      return;
    }

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

  const currentStep =
    !isAdminPreview && subscriptionId ? 3 : packageId && deliveryDays.length > 0 ? 2 : 1;

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-200/70 animate-pulse" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-72 rounded-3xl bg-white border border-slate-200/70 animate-pulse" />
          <div className="h-72 rounded-3xl bg-white border border-slate-200/70 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ================= BANNER CHẾ ĐỘ XEM TRƯỚC DÀNH CHO ADMIN ================= */}
      {isAdminPreview && (
        <div
          role="region"
          aria-label="Chế độ xem trước của Quản trị viên"
          className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3.5 text-amber-950 shadow-2xs"
        >
          <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm">
            <Eye className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <p className="font-semibold">
              Bạn đang xem giao diện gói rau định kỳ ở trang khách hàng dưới quyền{" "}
              <strong className="font-extrabold">Quản trị viên (Admin)</strong>. Thao tác đăng ký
              và thanh toán ApiPay được khóa.
            </p>
          </div>
          <Link
            to="/admin/catalog?tab=subscriptions"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] px-3.5 py-2 text-xs font-extrabold text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại quản lý gói</span>
          </Link>
        </div>
      )}

      {/* ================= HERO BANNER & THANH 3 BƯỚC ================= */}
      <header className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#00450d] via-[#065214] to-[#006e1c] text-white shadow-sm border border-[#0b5e1a]">
        <div className="p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/12 border border-white/20 text-[11px] font-extrabold uppercase tracking-wider text-[#91f78e]">
                <CalendarCheck2 className="w-3.5 h-3.5" />
                Nông sản sạch · Giao định kỳ
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black">
                <Sparkles className="w-3 h-3" />
                Tiết kiệm 20%
              </span>
            </div>

            <h1
              className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold tracking-tight text-white leading-tight"
              style={{ fontFamily: "var(--font-headline)" }}
            >
              Đăng ký gói rau định kỳ
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Chọn gói rau hữu cơ theo nhu cầu gia đình, thiết lập lịch giao cố định hằng tuần và
              địa chỉ nhận hàng. Đăng ký được kích hoạt ngay sau khi ApiPay xác nhận thanh toán.
            </p>

            {/* 3 điểm cam kết nhanh */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[12px] text-emerald-100">
              <span className="inline-flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-[#91f78e] shrink-0" />
                Thu hoạch sáng sớm theo lô FEFO
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PauseCircle className="w-4 h-4 text-[#91f78e] shrink-0" />
                Tạm hoãn lịch linh hoạt trước 12h
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#91f78e] shrink-0" />
                Đạt chuẩn VietGAP & Hữu cơ TCVN
              </span>
            </div>
          </div>

          {/* Thẻ tiến trình 3 bước */}
          <div className="lg:w-[340px] shrink-0 rounded-2xl bg-black/20 backdrop-blur-xs border border-white/15 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Quy trình đăng ký
              </span>
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#91f78e] hover:underline"
              >
                <ArrowLeft className="w-3 h-3" />
                Cửa hàng lẻ
              </Link>
            </div>

            <ol className="space-y-2 text-xs">
              {[
                { step: 1, title: "Chọn gói nông sản phù hợp" },
                { step: 2, title: "Cài đặt lịch giao tuần & địa chỉ" },
                { step: 3, title: "Thanh toán QR ApiPay & kích hoạt" },
              ].map((item) => {
                const isDone = currentStep > item.step;
                const isCurrent = currentStep === item.step;
                return (
                  <li
                    key={item.step}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${
                      isCurrent
                        ? "bg-white text-[#00450d] border-white font-bold shadow-xs"
                        : isDone
                        ? "bg-emerald-500/20 text-white border-emerald-300/30 font-semibold"
                        : "bg-white/5 text-emerald-100/75 border-white/10"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? "bg-[#00450d] text-white"
                          : isDone
                          ? "bg-[#91f78e] text-[#00450d]"
                          : "bg-white/15 text-white"
                      }`}
                    >
                      {isDone ? "✓" : item.step}
                    </span>
                    <span className="truncate">{item.title}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </header>

      {/* ================= THÔNG BÁO LỖI / TRẠNG THÁI ================= */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-2xs"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="font-medium">{errorMessage}</p>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-6 flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-2xs"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="font-semibold">{notice}</p>
        </div>
      )}

      {/* ================= NỘI DUNG CHÍNH ================= */}
      {!isAdminPreview && subscriptionId ? (
        <section className="rounded-3xl border border-[#c0c9bb]/50 bg-white p-6 sm:p-8 shadow-xs">
          <div className="grid gap-6 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                Chờ xác nhận thanh toán ApiPay
              </span>
              <h2 className="text-2xl font-extrabold text-slate-950">
                Đăng ký #{subscriptionId} đang chờ thanh toán
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gói rau định kỳ chưa được kích hoạt cho đến khi hệ thống nhận được xác nhận thanh
                toán từ cổng ApiPay. Bạn có thể quét mã QR bên cạnh hoặc mở trang thanh toán trực
                tiếp.
              </p>

              {subscriptionStatus && (
                <div className="inline-flex flex-wrap items-center gap-2 rounded-xl bg-[#f8faf8] border border-[#c0c9bb]/50 px-3.5 py-2 text-xs text-slate-700">
                  <span>
                    Trạng thái gói:{" "}
                    <strong className="text-[#00450d]">{subscriptionStatus.status}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Thanh toán:{" "}
                    <strong>{subscriptionStatus.payment_status ?? "Chưa khởi tạo"}</strong>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startPayment(subscriptionId)}
                  disabled={isSubmitting || isCancelling || !apiPayReady}
                  className="min-h-11 rounded-xl bg-[#00450d] hover:bg-[#006e1c] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Đang xử lý..."
                      : payment
                      ? "Lấy lại liên kết thanh toán"
                      : "Tiếp tục thanh toán"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setStatusRefresh((current) => current + 1);
                  }}
                  disabled={isSubmitting || isCancelling}
                  className="min-h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Kiểm tra trạng thái thanh toán</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isSubmitting || isCancelling}
                  className="min-h-11 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isCancelling ? "Đang hủy..." : "Hủy đăng ký"}</span>
                </button>
              </div>
            </div>

            {paymentUrl && (
              <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-emerald-50 to-[#f8faf8] border border-emerald-200/80 p-5 text-center space-y-3">
                <p className="text-sm font-extrabold text-[#00450d]">
                  Quét mã QR ApiPay để kích hoạt
                </p>
                {payment.qr_url && (
                  <div className="mx-auto w-52 h-52 rounded-2xl bg-white p-3 border border-emerald-200/70 shadow-xs flex items-center justify-center">
                    <img
                      src={payment.qr_url}
                      alt="Mã QR thanh toán ApiPay"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#00450d] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#006e1c] transition-colors"
                >
                  <span>Mở trang thanh toán ApiPay</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                {payment.expires_at && (
                  <p className="text-xs text-slate-500">
                    Liên kết hết hạn: <strong>{payment.expires_at}</strong>
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      ) : packages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
          Hiện chưa có gói rau định kỳ đang mở bán.
        </div>
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
          isPreviewOnly={isAdminPreview}
        />
      )}
    </main>
  );
}