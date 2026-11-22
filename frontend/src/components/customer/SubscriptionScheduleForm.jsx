/* Customer-facing package, address, start date, and weekly schedule form. */
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  PauseCircle,
  Scale,
  Sparkles,
} from "lucide-react";

const WEEKDAYS = [
  { value: 1, label: "Chủ Nhật" },
  { value: 2, label: "Thứ Hai" },
  { value: 3, label: "Thứ Ba" },
  { value: 4, label: "Thứ Tư" },
  { value: 5, label: "Thứ Năm" },
  { value: 6, label: "Thứ Sáu" },
  { value: 7, label: "Thứ Bảy" },
];

const DELIVERY_WINDOWS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
];

export default function SubscriptionScheduleForm({
  packages,
  addresses,
  addressMode,
  packageId,
  addressId,
  shippingAddress,
  startDate,
  minStartDate,
  deliveryDays,
  onPackageChange,
  onAddressModeChange,
  onAddressChange,
  onShippingAddressChange,
  onStartDateChange,
  onToggleDay,
  onWindowChange,
  onSubmit,
  isSubmitting,
  apiPayReady,
  isPreviewOnly = false,
}) {
  const selectedPackage = packages.find((item) => String(item.id) === String(packageId));
  const selectedAddressObj = addresses.find((item) => String(item.id) === String(addressId));

  const selectedScheduleSummary = deliveryDays
    .map((item) => {
      const dayLabel = WEEKDAYS.find((day) => day.value === item.weekday)?.label;
      return dayLabel ? `${dayLabel} (${item.delivery_window})` : null;
    })
    .filter(Boolean);

  return (
    <form onSubmit={onSubmit} aria-label="Đăng ký gói rau định kỳ" className="space-y-8">
      {/* ================= BƯỚC 1: CHỌN GÓI NÔNG SẢN ĐỊNH KỲ ================= */}
      <fieldset>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <legend className="flex items-center gap-2.5 text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            <span className="w-7 h-7 rounded-xl bg-[#00450d] text-white text-xs font-extrabold inline-flex items-center justify-center">
              1
            </span>
            <span>Chọn gói nông sản định kỳ</span>
          </legend>
          <span className="text-xs font-medium text-slate-500">
            Nhấp vào thẻ để chọn gói phù hợp với gia đình
          </span>
        </div>

        <div
          className={`grid gap-5 ${packages.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
            }`}
        >
          {packages.map((item, index) => {
            const isSelected = String(item.id) === String(packageId);
            const isPopular = index === 0;

            return (
              <label key={item.id} className="block cursor-pointer group">
                <input
                  type="radio"
                  name="subscription-package"
                  value={item.id}
                  checked={isSelected}
                  onChange={() => onPackageChange(String(item.id))}
                  required
                  disabled={isSubmitting}
                  className="peer sr-only"
                />
                <span
                  className={`flex flex-col justify-between h-full rounded-3xl border p-5 sm:p-6 transition-all duration-200 peer-focus-visible:ring-2 peer-focus-visible:ring-[#00450d] peer-focus-visible:ring-offset-2 ${isSelected
                    ? "border-[#00450d] bg-gradient-to-b from-[#f2fbf2] via-white to-white ring-2 ring-[#00450d]/15 shadow-md"
                    : "border-[#c0c9bb]/60 bg-white shadow-2xs hover:border-[#006e1c]/50 hover:shadow-md"
                    }`}
                >
                  <div>
                    {/* Huy hiệu trên cùng */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected
                            ? "bg-[#00450d]/10 text-[#00450d]"
                            : "bg-slate-100 text-slate-700"
                            }`}
                        >
                          <Scale className="w-3.5 h-3.5 text-[#006e1c]" />
                          {Number(item.weight_per_delivery)} kg/lần ·{" "}
                          {Number(item.duration_months)} tháng
                        </span>

                        {isPopular && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1 text-[10.5px] font-extrabold">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Phổ biến
                          </span>
                        )}
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-extrabold inline-flex items-center gap-1 transition-colors ${isSelected
                          ? "bg-[#00450d] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-[#00450d]"
                          }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        <span>{isSelected ? "Đang chọn" : "Chọn gói"}</span>
                      </span>
                    </div>

                    {/* Tên gói & Mô tả */}
                    <span className="block text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                      {item.name}
                    </span>

                    {item.description && (
                      <span className="mt-1.5 block text-[13px] leading-relaxed text-slate-600">
                        {item.description}
                      </span>
                    )}

                    {/* Khung giá gói */}
                    <span
                      className={`mt-4 flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3.5 border ${isSelected
                        ? "bg-[#00450d] text-white border-[#00450d]"
                        : "bg-[#f6f8f6] text-slate-900 border-[#c0c9bb]/40"
                        }`}
                    >
                      <span>
                        <span
                          className={`block text-[10.5px] font-bold uppercase tracking-wider ${isSelected ? "text-emerald-200" : "text-slate-500"
                            }`}
                        >
                          Giá trọn gói
                        </span>
                        <span
                          className={`mt-0.5 block text-2xl sm:text-[26px] font-black tabular-nums ${isSelected ? "text-[#91f78e]" : "text-[#00450d]"
                            }`}
                        >
                          {Number(item.price).toLocaleString("vi-VN")}đ
                        </span>
                      </span>

                      <span
                        className={`text-xs font-semibold ${isSelected ? "text-emerald-100" : "text-slate-500"
                          }`}
                      >
                        / {Number(item.duration_months)} tháng
                      </span>
                    </span>
                  </div>

                  {/* Thành phần rau mỗi lần giao */}
                  {/* Thành phần rau mỗi lần giao — bấm vào từng món để xem chi tiết sản phẩm */}
                  {item.items?.length > 0 && (
                    <span className="mt-4 pt-3.5 border-t border-slate-100 block">
                      <span className="flex items-center justify-between gap-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-[#006e1c]" />
                          <span>Bao gồm mỗi lần giao</span>
                        </span>
                        <span className="text-[10.5px] font-semibold normal-case text-[#006e1c]">
                          Bấm tên món để xem chi tiết
                        </span>
                      </span>

                      <span className="grid gap-1.5">
                        {item.items.map((packageItem) => {
                          const hasProductLink = Number(packageItem.product_id) > 0;
                          const rowInner = (
                            <>
                              <span className="flex items-center gap-2 min-w-0">
                                <CheckCircle2
                                  className="h-4 w-4 shrink-0 text-[#006e1c]"
                                  aria-hidden="true"
                                />
                                <span className="truncate font-semibold group-hover/prod:text-[#00450d] group-hover/prod:underline transition-colors">
                                  {packageItem.product_name}
                                </span>
                                {hasProductLink && (
                                  <ArrowUpRight
                                    className="h-3.5 w-3.5 shrink-0 text-[#006e1c] opacity-60 group-hover/prod:opacity-100 group-hover/prod:translate-x-0.5 group-hover/prod:-translate-y-0.5 transition-all"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>

                              <span className="shrink-0 rounded-lg bg-white border border-slate-200/80 px-2.5 py-0.5 text-xs font-extrabold text-[#00450d] tabular-nums">
                                {Number(packageItem.quantity)} {packageItem.unit}
                              </span>
                            </>
                          );

                          return hasProductLink ? (
                            <Link
                              key={`${item.id}-${packageItem.product_id}`}
                              to={`/products/${packageItem.product_id}`}
                              onClick={(e) => e.stopPropagation()}
                              title={`Xem chi tiết ${packageItem.product_name}`}
                              className="group/prod flex items-center justify-between gap-2 rounded-xl bg-[#f8faf8] hover:bg-emerald-50/90 px-3 py-2 text-[13px] text-slate-700 border border-slate-100 hover:border-emerald-300/80 transition-colors"
                            >
                              {rowInner}
                            </Link>
                          ) : (
                            <span
                              key={`${item.id}-${packageItem.product_id}`}
                              className="flex items-center justify-between gap-2 rounded-xl bg-[#f8faf8] px-3 py-2 text-[13px] text-slate-700 border border-slate-100"
                            >
                              {rowInner}
                            </span>
                          );
                        })}
                      </span>
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ================= BƯỚC 2 & 3: CẤU HÌNH LỊCH + ĐỊA CHỈ (TRÁI) & TÓM TẮT THANH TOÁN (PHẢI) ================= */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* CỘT TRÁI (7 CỘT): LỊCH NHẬN HÀNG & ĐỊA CHỈ */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Lịch nhận hàng hằng tuần */}
          <section className="rounded-3xl border border-[#c0c9bb]/50 bg-white p-5 sm:p-6 shadow-2xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2.5 text-base sm:text-lg font-extrabold text-slate-900">
                <span className="w-7 h-7 rounded-xl bg-[#00450d] text-white text-xs font-extrabold inline-flex items-center justify-center">
                  2
                </span>
                <CalendarDays className="h-5 w-5 text-[#006e1c]" aria-hidden="true" />
                <span>Tùy chỉnh lịch nhận hàng</span>
              </h2>
              {deliveryDays.length > 0 && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-[#00450d]">
                  {deliveryDays.length} buổi/tuần
                </span>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 items-end">
              <label
                htmlFor="subscription-start"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Ngày bắt đầu nhận rau *
                <input
                  id="subscription-start"
                  type="date"
                  min={minStartDate}
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/60 px-3.5 py-2.5 text-xs text-emerald-950 flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-[#006e1c] shrink-0" />
                <span>Có thể tạm hoãn hoặc đổi ngày giao bất kỳ tuần nào trước 12 giờ.</span>
              </div>
            </div>

            <fieldset className="mt-5 pt-4 border-t border-slate-100">
              <legend className="text-sm font-extrabold text-slate-800">
                Chọn ngày giao lặp lại hằng tuần *
              </legend>
              <p className="mt-0.5 text-xs text-slate-500">
                Tích chọn một hoặc nhiều ngày trong tuần, sau đó điều chỉnh khung giờ nhận phù hợp.
              </p>

              <div className="mt-3.5 grid gap-2.5 sm:grid-cols-2">
                {WEEKDAYS.map((day) => {
                  const selected = deliveryDays.find(
                    (deliveryDay) => deliveryDay.weekday === day.value
                  );
                  return (
                    <div
                      key={day.value}
                      className={`rounded-2xl border p-3 transition-all ${selected
                        ? "border-[#00450d] bg-[#f2fbf2] shadow-2xs"
                        : "border-slate-200/90 bg-white hover:border-slate-300"
                        }`}
                    >
                      <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-sm font-bold text-slate-800">
                        <span className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={Boolean(selected)}
                            onChange={() => onToggleDay(day.value)}
                            disabled={isSubmitting}
                            className="h-4 w-4 rounded accent-[#00450d]"
                          />
                          <span>{day.label}</span>
                        </span>
                        {selected ? (
                          <span className="rounded-full bg-[#00450d] text-white px-2 py-0.5 text-[10.5px] font-bold">
                            Đã chọn
                          </span>
                        ) : (
                          <span className="text-[11px] font-normal text-slate-400">Trống</span>
                        )}
                      </label>

                      {selected && (
                        <label className="mt-2.5 pt-2 border-t border-emerald-200/70 block text-xs font-semibold text-slate-700">
                          <span className="mb-1 flex items-center gap-1 text-[11px] text-[#00450d]">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            Khung giờ nhận hàng
                          </span>
                          <select
                            aria-label={`Khung giờ giao ${day.label}`}
                            value={selected.delivery_window}
                            onChange={(event) => onWindowChange(day.value, event.target.value)}
                            disabled={isSubmitting}
                            className="min-h-10 w-full rounded-xl border border-emerald-300/80 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#00450d] focus:ring-2 focus:ring-emerald-100"
                          >
                            {DELIVERY_WINDOWS.map((window) => (
                              <option key={window} value={window}>
                                {window}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* Card 2: Địa chỉ nhận rau định kỳ */}
          <section className="rounded-3xl border border-[#c0c9bb]/50 bg-white p-5 sm:p-6 shadow-2xs">
            <h2 className="flex items-center gap-2.5 border-b border-slate-100 pb-4 text-base sm:text-lg font-extrabold text-slate-900">
              <MapPin className="h-5 w-5 text-[#006e1c]" aria-hidden="true" />
              <span>Địa chỉ nhận rau định kỳ</span>
            </h2>

            <div className="mt-4 inline-flex flex-wrap gap-2 rounded-2xl bg-[#f2f4f2] p-1.5">
              {addresses.length > 0 && (
                <label
                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${addressMode === "saved"
                    ? "bg-white text-[#00450d] shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  <input
                    type="radio"
                    name="subscription-address-mode"
                    value="saved"
                    checked={addressMode === "saved"}
                    onChange={() => onAddressModeChange("saved")}
                    disabled={isSubmitting}
                    className="h-3.5 w-3.5 accent-[#00450d]"
                  />
                  Chọn địa chỉ đã lưu
                </label>
              )}
              <label
                className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-all ${addressMode === "new"
                  ? "bg-white text-[#00450d] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <input
                  type="radio"
                  name="subscription-address-mode"
                  value="new"
                  checked={addressMode === "new"}
                  onChange={() => onAddressModeChange("new")}
                  disabled={isSubmitting}
                  className="h-3.5 w-3.5 accent-[#00450d]"
                />
                Nhập địa chỉ mới
              </label>
            </div>

            {addressMode === "saved" && (
              <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Sổ địa chỉ giao hàng *
                <select
                  id="subscription-address"
                  value={addressId}
                  onChange={(event) => onAddressChange(event.target.value)}
                  required
                  disabled={isSubmitting || addresses.length === 0}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-medium text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
                >
                  <option value="" disabled>
                    Chọn địa chỉ nhận hàng
                  </option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.recipient_name} — {address.address}
                      {address.is_default ? " (Mặc định)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {addressMode === "new" && (
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-700">
                  Họ tên người nhận *
                  <input
                    autoComplete="name"
                    value={shippingAddress.recipient_name}
                    onChange={(event) =>
                      onShippingAddressChange("recipient_name", event.target.value)
                    }
                    maxLength={150}
                    required
                    disabled={isSubmitting}
                    placeholder="Nguyễn Văn A"
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-normal text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Số điện thoại *
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={shippingAddress.phone}
                    onChange={(event) => onShippingAddressChange("phone", event.target.value)}
                    pattern="(?:[+]84|0)[0-9]{9,10}"
                    title="Nhập số điện thoại Việt Nam, ví dụ 0912345678 hoặc +84912345678"
                    maxLength={13}
                    required
                    disabled={isSubmitting}
                    placeholder="0912345678"
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-normal text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700 sm:col-span-2">
                  Địa chỉ giao hàng *
                  <input
                    autoComplete="street-address"
                    value={shippingAddress.street}
                    onChange={(event) => onShippingAddressChange("street", event.target.value)}
                    maxLength={255}
                    required
                    disabled={isSubmitting}
                    placeholder="Số nhà, tên đường, ấp/khu phố..."
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-normal text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Phường / xã mới *
                  <input
                    value={shippingAddress.ward}
                    onChange={(event) => onShippingAddressChange("ward", event.target.value)}
                    maxLength={100}
                    required
                    disabled={isSubmitting}
                    placeholder="Ví dụ: Phường Bến Nghé"
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-normal text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <label className="text-xs font-bold text-slate-700">
                  Tỉnh / thành phố *
                  <input
                    autoComplete="address-level1"
                    value={shippingAddress.province}
                    onChange={(event) => onShippingAddressChange("province", event.target.value)}
                    maxLength={100}
                    required
                    disabled={isSubmitting}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-[#f8faf8] px-3.5 text-sm font-normal text-slate-800 outline-none focus:border-[#00450d] focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
                <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                  Dùng phường/xã hiện hành và tỉnh/thành phố; không nhập quận/huyện. Địa chỉ mới sẽ
                  được lưu và định vị để tính giao hàng.
                </p>
              </div>
            )}

            {addresses.length === 0 && (
              <p className="mt-3 text-xs font-medium text-amber-800" role="status">
                Nhập địa chỉ bên trên để lưu vào tài khoản và tiếp tục đăng ký.
              </p>
            )}
          </section>
        </div>

        {/* CỘT PHẢI (5 CỘT): TÓM TẮT ĐĂNG KÝ & NÚT THANH TOÁN CỐ ĐỊNH */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="overflow-hidden rounded-3xl border border-[#c0c9bb]/60 bg-white shadow-sm">
            <div className="bg-[#00450d] px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-white/15 text-[#91f78e] text-xs font-extrabold inline-flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-extrabold tracking-tight">
                  Tóm tắt gói đăng ký
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[#91f78e]">ApiPay QR</span>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Chi tiết gói đang chọn */}
              <div className="rounded-2xl bg-[#f6f8f6] border border-[#c0c9bb]/40 p-4 space-y-2.5 text-xs sm:text-[13px]">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Gói nông sản</span>
                  <span className="text-right font-extrabold text-slate-900">
                    {selectedPackage?.name ?? "Vui lòng chọn gói ở Bước 1"}
                  </span>
                </div>

                {selectedPackage && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500">Định lượng & Chu kỳ</span>
                    <span className="font-semibold text-[#00450d]">
                      {Number(selectedPackage.weight_per_delivery)} kg/lần ·{" "}
                      {Number(selectedPackage.duration_months)} tháng
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Ngày bắt đầu</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {startDate || "Chưa chọn"}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/70">
                  <span className="text-slate-500 block mb-1.5">Lịch giao hằng tuần</span>
                  {selectedScheduleSummary.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedScheduleSummary.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 rounded-lg bg-white border border-emerald-200 px-2.5 py-1 text-[11.5px] font-bold text-[#00450d]"
                        >
                          <Clock3 className="w-3 h-3 text-[#006e1c]" />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs italic text-amber-700">
                      Chưa chọn ngày giao trong tuần
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/70">
                  <span className="text-slate-500 block mb-1">Nơi nhận hàng</span>
                  {addressMode === "saved" ? (
                    <span className="font-semibold text-slate-800 leading-snug block">
                      {selectedAddressObj
                        ? `${selectedAddressObj.recipient_name} • ${selectedAddressObj.address}`
                        : "Chưa chọn địa chỉ"}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-800 leading-snug block">
                      {shippingAddress.street
                        ? `${shippingAddress.recipient_name || "Người nhận"} • ${shippingAddress.street
                        }, ${shippingAddress.ward}, ${shippingAddress.province}`
                        : "Nhập địa chỉ nhận hàng ở cột bên trái"}
                    </span>
                  )}
                </div>
              </div>

              {/* Tổng chi phí */}
              <div className="flex items-baseline justify-between gap-3 pt-1">
                <div>
                  <span className="block text-sm font-extrabold text-slate-900">
                    Tổng chi phí gói
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Đã bao gồm đóng gói bảo quản mát
                  </span>
                </div>
                <span className="text-2xl font-black text-[#00450d] tabular-nums">
                  {selectedPackage
                    ? `${Number(selectedPackage.price).toLocaleString("vi-VN")}đ`
                    : "0đ"}
                </span>
              </div>

              {isPreviewOnly ? (
                <div
                  className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
                  role="status"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Chế độ xem trước dành cho Quản trị viên: bạn có thể kiểm tra thông tin các
                    gói nhưng không thể tạo đơn đăng ký hoặc thanh toán ApiPay.
                  </span>
                </div>
              ) : (
                !apiPayReady && (
                  <div
                    className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900"
                    role="alert"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook. Vui lòng
                      liên hệ quản trị viên.
                    </span>
                  </div>
                )
              )}

              <button
                type="submit"
                disabled={
                  isPreviewOnly ||
                  isSubmitting ||
                  !apiPayReady ||
                  !packageId ||
                  (addressMode === "saved" && !addressId) ||
                  !startDate ||
                  deliveryDays.length === 0
                }
                className="min-h-12 w-full rounded-2xl bg-[#00450d] hover:bg-[#006e1c] px-5 py-3.5 text-sm font-extrabold text-white shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00450d] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <span>
                  {isPreviewOnly
                    ? "Chế độ xem trước Admin (Không thể thanh toán)"
                    : isSubmitting
                      ? "Đang xử lý..."
                      : "Đăng ký gói & thanh toán ApiPay"}
                </span>
                {!isPreviewOnly && !isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>

              <p className="text-center text-[11.5px] leading-relaxed text-slate-500">
                Bạn có thể theo dõi, đổi lịch hoặc tạm hoãn giao hàng bất kỳ lúc nào trong trang{" "}
                <strong className="text-slate-700">Đơn hàng của tôi</strong>.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}