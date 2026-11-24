/* Khối chọn địa chỉ giao hàng, thêm địa chỉ mới và hiển thị khoảng cách vận chuyển. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Navigation, Plus, X } from "lucide-react";
import { customerApi } from "../../services/customerApi";
import { formatCurrencyVnd } from "../../services/publicApi";
import { showGlobalToast } from "../GlobalToast";

export default function AddressDistancePicker({
  addresses = [],
  selectedAddressId = "",
  onSelectAddress,
  onAddressCreated,
  originName = "Nhà C - Trường Cao đẳng Kỹ thuật Cao Thắng",
  distanceKm = 0,
  pricePerKm = 2000,
  quote = null,
  quoteLoading = false,
  quoteError = "",
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({
    recipient_name: "",
    phone: "",
    street: "",
    ward: "",
    province: "TP. Hồ Chí Minh",
    is_default: false,
  });

  const safeAddresses = Array.isArray(addresses) ? addresses : [];
  const selectedAddress =
    safeAddresses.find((addr) => String(addr.id) === String(selectedAddressId)) || null;

  const displayDistance = Number(quote?.distance_km ?? distanceKm ?? 0);
  const displayPricePerKm = Number(quote?.price_per_km ?? pricePerKm ?? 2000);
  const displayOrigin = quote?.origin_name || originName;

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError("");
    try {
      const res = await customerApi.createAddress({
        recipient_name: form.recipient_name.trim(),
        phone: form.phone.trim(),
        street: form.street.trim(),
        ward: form.ward.trim(),
        province: form.province.trim(),
        is_default: Boolean(form.is_default || safeAddresses.length === 0),
      });

      const created = res?.data?.data ?? res?.data ?? null;
      if (!created?.id) {
        throw new Error("Không nhận được thông tin địa chỉ mới từ máy chủ.");
      }

      onAddressCreated?.(created);
      onSelectAddress?.(String(created.id));
      setIsAdding(false);
      setForm({
        recipient_name: "",
        phone: "",
        street: "",
        ward: "",
        province: "TP. Hồ Chí Minh",
        is_default: false,
      });
      showGlobalToast("Đã thêm địa chỉ giao hàng mới.", "success");
    } catch (err) {
      const fieldErrors = Object.values(
        err?.fieldErrors ?? err?.response?.data?.errors ?? {}
      ).flat();
      setFormError(
        fieldErrors[0] ||
          err?.message ||
          err?.response?.data?.message ||
          "Không thể lưu địa chỉ mới. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setSaving(false);
    }
  };

  const showForm = isAdding || safeAddresses.length === 0;

  return (
    <section className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm sm:text-base font-extrabold text-[#191c1b] flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#006e1c]" />
          <span>Địa chỉ giao hàng</span>
        </h2>
        <Link
          to="/profile?tab=addresses"
          className="text-xs font-bold text-[#006e1c] hover:underline"
        >
          Quản lý sổ địa chỉ
        </Link>
      </div>

      {safeAddresses.length > 0 && (
        <select
          value={String(selectedAddressId || "")}
          onChange={(e) => onSelectAddress?.(e.target.value)}
          aria-label="Chọn địa chỉ giao hàng"
          className="w-full min-h-11 px-3.5 py-2 rounded-2xl bg-[#f8faf8] border border-[#c0c9bb]/70 text-xs sm:text-sm font-semibold text-[#191c1b] outline-none focus:border-[#00450d] focus:bg-white"
        >
          {safeAddresses.map((addr) => (
            <option key={addr.id} value={String(addr.id)}>
              {addr.recipient_name} — {addr.address}
            </option>
          ))}
        </select>
      )}

      {selectedAddress && (
        <div className="rounded-2xl bg-[#f8faf8] border border-[#c0c9bb]/45 p-3.5 text-xs space-y-1">
          <p className="font-extrabold text-[#191c1b]">{selectedAddress.recipient_name}</p>
          <p className="text-[#5a6357] tabular-nums">{selectedAddress.phone}</p>
          <p className="text-[#41493e] leading-relaxed">{selectedAddress.address}</p>
          <button
            type="button"
            onClick={() => {
              setFormError("");
              setIsAdding((prev) => !prev);
            }}
            className="mt-2 px-3 py-1.5 rounded-xl bg-white hover:bg-[#f2f4f2] border border-[#c0c9bb]/70 text-xs font-bold text-[#191c1b] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isAdding ? (
              <>
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span>Đóng thêm địa chỉ</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-[#006e1c]" />
                <span>Thêm địa chỉ mới</span>
              </>
            )}
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreateAddress}
          className="rounded-2xl bg-[#f8faf8] border border-[#006e1c]/30 p-4 space-y-3"
        >
          <p className="text-xs font-extrabold text-[#00450d]">Nhập địa chỉ nhận hàng mới</p>

          {formError && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-[#41493e] mb-1">
                Họ tên người nhận *
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={form.recipient_name}
                onChange={(e) => handleFieldChange("recipient_name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full min-h-10 px-3 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs text-[#191c1b] outline-none focus:border-[#00450d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#41493e] mb-1">
                Số điện thoại *
              </label>
              <input
                type="tel"
                required
                maxLength={13}
                pattern="(?:[+]84|0)[0-9]{9,10}"
                value={form.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value)}
                placeholder="0912345678"
                className="w-full min-h-10 px-3 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs text-[#191c1b] outline-none focus:border-[#00450d]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-[#41493e] mb-1">
                Địa chỉ chi tiết (số nhà, tên đường) *
              </label>
              <input
                type="text"
                required
                maxLength={255}
                value={form.street}
                onChange={(e) => handleFieldChange("street", e.target.value)}
                placeholder="Ví dụ: 65 Huỳnh Thúc Kháng"
                className="w-full min-h-10 px-3 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs text-[#191c1b] outline-none focus:border-[#00450d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#41493e] mb-1">
                Phường / Xã *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.ward}
                onChange={(e) => handleFieldChange("ward", e.target.value)}
                placeholder="Phường Sài Gòn"
                className="w-full min-h-10 px-3 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs text-[#191c1b] outline-none focus:border-[#00450d]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#41493e] mb-1">
                Tỉnh / Thành phố *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                value={form.province}
                onChange={(e) => handleFieldChange("province", e.target.value)}
                className="w-full min-h-10 px-3 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs text-[#191c1b] outline-none focus:border-[#00450d]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {safeAddresses.length > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-2 rounded-xl bg-white border border-[#c0c9bb]/70 text-xs font-bold text-[#41493e] hover:bg-[#f2f4f2] cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? "Đang lưu & định vị..." : "Lưu & chọn địa chỉ này"}</span>
            </button>
          </div>
        </form>
      )}

      <div className="pt-2 border-t border-[#c0c9bb]/30 flex items-start gap-2 text-xs text-[#5a6357]">
        <Navigation className="w-3.5 h-3.5 text-[#006e1c] shrink-0 mt-0.5" />
        <div>
          <p>
            {displayOrigin} đến địa chỉ nhận:{" "}
            <strong className="text-[#191c1b] tabular-nums">
              {quoteLoading ? "Đang tính..." : `${displayDistance} km`}
            </strong>
          </p>
          <p>Phí giao hàng {formatCurrencyVnd(displayPricePerKm)}/km</p>
        </div>
      </div>

      {quoteError && <p className="text-xs font-semibold text-rose-600">{quoteError}</p>}
    </section>
  );
}