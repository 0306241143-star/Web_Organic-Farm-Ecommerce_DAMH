/* Customer-facing package, address, start date, and weekly schedule form. */
import { CalendarDays, CheckCircle2, Clock3, MapPin } from "lucide-react";

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
}) {
  const selectedPackage = packages.find((item) => String(item.id) === String(packageId));
  const selectedWeekdays = deliveryDays
    .map((item) => WEEKDAYS.find((day) => day.value === item.weekday)?.label)
    .filter(Boolean);

  return (
    <form onSubmit={onSubmit} aria-label="Đăng ký gói rau định kỳ" className="space-y-6">
      <fieldset>
        <legend className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
          Chọn gói nông sản định kỳ
        </legend>
        <div className="grid gap-5 lg:grid-cols-2">
          {packages.map((item, index) => {
            const isSelected = String(item.id) === String(packageId);
            return (
              <label key={item.id} className="block cursor-pointer">
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
                <span className={`block h-full rounded-2xl border bg-white p-5 shadow-sm transition hover:border-emerald-300 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-700 peer-focus-visible:ring-offset-2 sm:p-6 ${isSelected ? "border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600" : "border-slate-200"}`}>
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-lg font-extrabold text-slate-900">{item.name}</span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${isSelected ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {isSelected ? "Đang chọn" : "Chọn gói"}
                    </span>
                  </span>
                  {item.description && (
                    <span className="mt-2 block min-h-10 text-sm leading-6 text-slate-600">
                      {item.description}
                    </span>
                  )}
                  <span className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Giá gói</span>
                      <span className="mt-1 block text-2xl font-extrabold text-emerald-900">
                        {Number(item.price).toLocaleString("vi-VN")}đ
                      </span>
                    </span>
                    <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-900">
                      {Number(item.weight_per_delivery)} kg/lần · {Number(item.duration_months)} tháng
                    </span>
                  </span>
                  {item.items?.length > 0 && (
                    <span className="mt-4 block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Bao gồm mỗi lần giao
                      </span>
                      <span className="mt-2 grid gap-2">
                        {item.items.map((packageItem) => (
                          <span key={`${item.id}-${packageItem.product_id}`} className="flex items-start gap-2 text-sm text-slate-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                            <span>
                              <strong>{Number(packageItem.quantity)} {packageItem.unit}</strong> {packageItem.product_name}
                            </span>
                          </span>
                        ))}
                      </span>
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-extrabold text-slate-900">
            <CalendarDays className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            Tùy chỉnh lịch nhận hàng
          </h2>

          <label htmlFor="subscription-start" className="mt-5 block text-sm font-semibold text-slate-700">
            Ngày bắt đầu
            <input
              id="subscription-start"
              type="date"
              min={minStartDate}
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
              required
              disabled={isSubmitting}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <fieldset className="mt-5">
            <legend className="text-sm font-bold text-slate-800">Ngày giao lặp lại hằng tuần</legend>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Chọn ít nhất một ngày giao; có thể chọn nhiều ngày trong tuần.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {WEEKDAYS.map((day) => {
                const selected = deliveryDays.find((deliveryDay) => deliveryDay.weekday === day.value);
                return (
                  <div
                    key={day.value}
                    className={`rounded-xl border p-3 transition-colors ${selected ? "border-emerald-600 bg-emerald-50/60" : "border-slate-200"}`}
                  >
                    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() => onToggleDay(day.value)}
                          disabled={isSubmitting}
                          className="h-4 w-4 accent-emerald-800"
                        />
                        {day.label}
                      </span>
                      {selected && <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />}
                    </label>
                    {selected && (
                      <label className="mt-2 block text-xs font-semibold text-slate-600">
                        <span className="sr-only">Khung giờ giao {day.label}</span>
                        <span className="mb-1 flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Khung giờ giao
                        </span>
                        <select
                          aria-label={`Khung giờ giao ${day.label}`}
                          value={selected.delivery_window}
                          onChange={(event) => onWindowChange(day.value, event.target.value)}
                          disabled={isSubmitting}
                          className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-normal text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                        >
                          {DELIVERY_WINDOWS.map((window) => (
                            <option key={window} value={window}>{window}</option>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-lg font-extrabold text-slate-900">
            <MapPin className="h-5 w-5 text-emerald-700" aria-hidden="true" />
            Địa chỉ nhận rau định kỳ
          </h2>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {addresses.length > 0 && (
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="radio"
                  name="subscription-address-mode"
                  value="saved"
                  checked={addressMode === "saved"}
                  onChange={() => onAddressModeChange("saved")}
                  disabled={isSubmitting}
                  className="h-4 w-4 accent-emerald-800"
                />
                Chọn địa chỉ đã lưu
              </label>
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="radio"
                name="subscription-address-mode"
                value="new"
                checked={addressMode === "new"}
                onChange={() => onAddressModeChange("new")}
                disabled={isSubmitting}
                className="h-4 w-4 accent-emerald-800"
              />
              Nhập địa chỉ mới
            </label>
          </div>

          {addressMode === "saved" && (
            <label className="mt-3 block text-sm font-semibold text-slate-700">
              Địa chỉ giao hàng
              <select
                id="subscription-address"
                value={addressId}
                onChange={(event) => onAddressChange(event.target.value)}
                required
                disabled={isSubmitting || addresses.length === 0}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
              >
                <option value="" disabled>Chọn địa chỉ nhận hàng</option>
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
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Họ tên người nhận *
                <input
                  autoComplete="name"
                  value={shippingAddress.recipient_name}
                  onChange={(event) => onShippingAddressChange("recipient_name", event.target.value)}
                  maxLength={150}
                  required
                  disabled={isSubmitting}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
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
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Địa chỉ giao hàng *
                <input
                  autoComplete="street-address"
                  value={shippingAddress.street}
                  onChange={(event) => onShippingAddressChange("street", event.target.value)}
                  maxLength={255}
                  required
                  disabled={isSubmitting}
                  placeholder="Số nhà, tên đường, phường, quận..."
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Phường / xã *
                <input
                  value={shippingAddress.ward}
                  onChange={(event) => onShippingAddressChange("ward", event.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Quận / huyện *
                <input
                  value={shippingAddress.district}
                  onChange={(event) => onShippingAddressChange("district", event.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Tỉnh / thành phố *
                <input
                  autoComplete="address-level1"
                  value={shippingAddress.province}
                  onChange={(event) => onShippingAddressChange("province", event.target.value)}
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  className="mt-1 min-h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">
                Địa chỉ mới sẽ được lưu vào tài khoản và định vị để hỗ trợ tính toán giao hàng.
              </p>
            </div>
          )}

          {addresses.length === 0 && (
            <p className="mt-2 text-sm text-amber-800" role="status">
              Nhập địa chỉ bên dưới để lưu vào tài khoản và tiếp tục đăng ký.
            </p>
          )}

          <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
            <p className="font-bold text-slate-900">Thông tin gói đã chọn</p>
            <div className="mt-3 flex justify-between gap-3 text-slate-600">
              <span>Gói</span>
              <span className="text-right font-semibold text-slate-900">{selectedPackage?.name ?? "Chọn một gói"}</span>
            </div>
            <div className="mt-2 flex justify-between gap-3 text-slate-600">
              <span>Ngày giao</span>
              <span className="text-right font-semibold text-slate-900">
                {selectedWeekdays.length ? selectedWeekdays.join(", ") : "Chưa chọn"}
              </span>
            </div>
            {selectedPackage && (
              <div className="mt-3 flex justify-between gap-3 border-t border-slate-200 pt-3">
                <span className="font-bold text-slate-900">Tổng chi phí gói</span>
                <span className="text-lg font-extrabold text-emerald-900">
                  {Number(selectedPackage.price).toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}
          </div>

          {!apiPayReady && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook. Vui lòng liên hệ quản trị viên.
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !apiPayReady || !packageId || (addressMode === "saved" && !addressId) || !startDate || deliveryDays.length === 0}
            className="mt-5 min-h-12 w-full rounded-xl bg-[#0b4524] px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Đang xử lý..." : "Đăng ký gói & thanh toán ApiPay"}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">
            Bạn có thể kiểm tra và quản lý lịch giao sau khi đăng ký.
          </p>
        </section>
      </div>
    </form>
  );
}
