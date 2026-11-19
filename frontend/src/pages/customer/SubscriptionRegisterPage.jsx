/* Registration, ApiPay checkout, and status recovery for recurring vegetable packages. */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  const validationMessages = Object.values(error.response?.data?.errors ?? {}).flat();
  return validationMessages[0]
    || error.response?.data?.message
    || "Không thể xử lý đăng ký. Vui lòng thử lại.";
}

export default function SubscriptionRegisterPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const subscriptionStorageKey = user?.id ? `xanhfarm:pendingSubscription:${user.id}` : null;
  const idempotencyStorageKey = user?.id ? `xanhfarm:pendingSubscriptionIdempotency:${user.id}` : null;

  const [packages, setPackages] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [packageId, setPackageId] = useState(searchParams.get("package_id") ?? "");
  const [addressId, setAddressId] = useState("");
  const [startDate, setStartDate] = useState(() => localDateString());
  const [minStartDate] = useState(() => localDateString());
  const [deliveryDays, setDeliveryDays] = useState([]);
  const [bankConfigured, setBankConfigured] = useState(false);
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

  useEffect(() => {
    setSubscriptionId(
      subscriptionStorageKey ? window.localStorage.getItem(subscriptionStorageKey) ?? "" : ""
    );
    setPayment(null);
    setSubscriptionStatus(null);
  }, [subscriptionStorageKey]);

  useEffect(() => {
    let active = true;
    Promise.all([
      storefrontApi.getSubscriptions(),
      customerApi.getAddresses(),
      customerApi.getCheckoutOptions(),
    ])
      .then(([availablePackages, addressResponse, optionsResponse]) => {
        if (!active) return;
        const addressList = addressResponse.data?.data ?? [];
        setPackages(availablePackages);
        setAddresses(addressList);
        setAddressId(String(addressList.find((address) => address.is_default)?.id ?? addressList[0]?.id ?? ""));
        setBankConfigured(Boolean(optionsResponse.data?.data?.bank_configured));
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
        const status = response.data?.data;
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
        if (error.response?.status === 404) {
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
      setPayment(response.data?.data ?? null);
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
          address_id: Number(addressId),
          start_date: startDate,
          delivery_days: deliveryDays,
          idempotency_key: idempotencyKey,
        });
        id = String(registration.data?.data?.subscription_id ?? "");
        if (!id) throw new Error("Máy chủ chưa trả về mã đăng ký.");
        if (subscriptionStorageKey) window.localStorage.setItem(subscriptionStorageKey, id);
        if (idempotencyStorageKey) window.localStorage.removeItem(idempotencyStorageKey);
        setSubscriptionId(id);
      }

      const checkout = await customerApi.checkoutSubscription(id);
      setPayment(checkout.data?.data ?? null);
      setNotice("Đăng ký đã được lưu. Hoàn tất thanh toán để kích hoạt gói.");
    } catch (error) {
      if (error.response?.status === 409 && idempotencyStorageKey) {
        window.localStorage.removeItem(idempotencyStorageKey);
      }
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... giữ nguyên phần toggleDay, changeWindow và JSX render phía dưới ...
