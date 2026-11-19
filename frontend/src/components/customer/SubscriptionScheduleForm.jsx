/* Customer-facing package, address, start date, and weekly schedule form. */
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

  return (
    <form onSubmit={onSubmit} aria-label="Đăng ký gói rau định kỳ" className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="subscription-package" className="block text-lg font-extrabold text-slate-900">
          Chọn gói rau
        </label>
        <select
          id="subscription-package"
          value={packageId}
          onChange={(event) => onPackageChange(event.target.value)}
          required
          disabled={isSubmitting}
          className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">Chọn gói định kỳ</option>
          {packages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {Number(item.duration_months)} tháng
            </option>
          ))}
        </select>

        {selectedPackage && (
          <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
            <p className="font-bold">{selectedPackage.name}</p>
            {selectedPackage.description && <p className="mt-1">{selectedPackage.description}</p>}
            <p className="mt-2">
              {Number(selectedPackage.weight_per_delivery)} kg/lần · {Number(selectedPackage.duration_months)} tháng
            </p>
            <p className="mt-1 text-lg font-extrabold">
              {Number(selectedPackage.price).toLocaleString("vi-VN")}đ
            </p>
            {selectedPackage.items?.length > 0 && (
              <ul className="mt-2 list-inside list-disc">
                {selectedPackage.items.map((item) => (
                  <li key={`${selectedPackage.id}-${item.product_id}`}>
                    {item.product_name} — {Number(item.quantity)} {item.unit}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Địa chỉ giao hàng</h2>
        <div className="mt-3 flex flex-wrap gap-4">
          {addresses.length > 0 && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
              <input
                type="radio"
                name="subscription-address-mode"
                value="saved"
                checked={addressMode === "saved"}
                onChange={() => onAddressModeChange("saved")}
                disabled={isSubmitting}
              />
              Chọn địa chỉ đã lưu
            </label>
          )}
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800">
            <input
              type="radio"
              name="subscription-address-mode"
              value="new"
              checked={addressMode === "new"}
              onChange={() => onAddressModeChange("new")}
              disabled={isSubmitting}
            />
            Nhập địa chỉ giao hàng mới
          </label>
        </div>

        {addressMode === "saved" && (
          <select
            id="subscription-address"
            value={addressId}
            onChange={(event) => onAddressChange(event.target.value)}
            required
            disabled={isSubmitting || addresses.length === 0}
            className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          >
            <option value="">Chọn địa chỉ nhận hàng</option>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.recipient_name} — {address.address}
                {address.is_default ? " (Mặc định)" : ""}
              </option>
            ))}
          </select>
        )}

        {addressMode === "new" && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-800">
              Tên người nhận
              <input
                autoComplete="name"
                value={shippingAddress.recipient_name}
                onChange={(event) => onShippingAddressChange("recipient_name", event.target.value)}
                maxLength={150}
                required
                disabled={isSubmitting}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Số điện thoại
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
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
              Số nhà, tên đường
              <input
                autoComplete="street-address"
                value={shippingAddress.street}
                onChange={(event) => onShippingAddressChange("street", event.target.value)}
                maxLength={255}
                required
                disabled={isSubmitting}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Phường / xã
              <input
                value={shippingAddress.ward}
                onChange={(event) => onShippingAddressChange("ward", event.target.value)}
                maxLength={100}
                required
                disabled={isSubmitting}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800">
              Quận / huyện
              <input
                value={shippingAddress.district}
                onChange={(event) => onShippingAddressChange("district", event.target.value)}
                maxLength={100}
                required
                disabled={isSubmitting}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold text-slate-800 sm:col-span-2">
              Tỉnh / thành phố
              <input
                autoComplete="address-level1"
                value={shippingAddress.province}
                onChange={(event) => onShippingAddressChange("province", event.target.value)}
                maxLength={100}
                required
                disabled={isSubmitting}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal"
              />
            </label>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Địa chỉ mới sẽ được lưu vào tài khoản và định vị để hỗ trợ tính toán giao hàng.
            </p>
          </div>
        )}
        {addresses.length === 0 && (
          <p className="mt-2 text-sm text-amber-800" role="status">
            Nhập địa chỉ bên dưới để lưu vào tài khoản và tiếp tục đăng ký.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <label htmlFor="subscription-start" className="block text-lg font-extrabold text-slate-900">
          Ngày bắt đầu
        </label>
        <input
          id="subscription-start"
          type="date"
          min={minStartDate}
          value={startDate}
          onChange={(event) => onStartDateChange(event.target.value)}
          required
          disabled={isSubmitting}
          className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-800 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <fieldset>
          <legend className="text-lg font-extrabold text-slate-900">Ngày giao lặp lại hằng tuần</legend>
          <p className="mt-1 text-sm text-slate-600">
            Chọn ít nhất một ngày; quy ước ngày trong tuần: Chủ Nhật = 1, Thứ Bảy = 7.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {WEEKDAYS.map((day) => {
              const selected = deliveryDays.find((item) => item.weekday === day.value);
              return (
                <div key={day.value} className="rounded-xl border border-slate-200 p-3">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={Boolean(selected)}
                      onChange={() => onToggleDay(day.value)}
                      disabled={isSubmitting}
                      className="h-4 w-4 accent-emerald-800"
                    />
                    {day.label}
                  </label>
                  {selected && (
                    <select
                      aria-label={`Khung giờ giao ${day.label}`}
                      value={selected.delivery_window}
                      onChange={(event) => onWindowChange(day.value, event.target.value)}
                      disabled={isSubmitting}
                      className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
                    >
                      {DELIVERY_WINDOWS.map((window) => (
                        <option key={window} value={window}>{window}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      </section>

      {!apiPayReady && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook. Vui lòng liên hệ quản trị viên.
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !apiPayReady || !packageId || (addressMode === "saved" && !addressId) || !startDate || deliveryDays.length === 0}
        className="min-h-11 w-full rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "Đang xử lý..." : "Đăng ký gói & thanh toán ApiPay"}
      </button>
    </form>
  );
}
