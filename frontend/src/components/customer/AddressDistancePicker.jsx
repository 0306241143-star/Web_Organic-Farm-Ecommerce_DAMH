/* Customer-owned delivery address selector for retail checkout. */
export default function AddressDistancePicker({
  addresses,
  value,
  onChange,
  disabled = false,
}) {
  const selectedAddress = addresses.find((address) => String(address.id) === String(value));

  return (
    <section aria-label="Địa chỉ giao hàng" className="rounded-2xl border border-slate-200 bg-white p-5">
      <label htmlFor="delivery-address" className="block text-lg font-extrabold text-slate-900">
        Địa chỉ giao hàng
      </label>
      {addresses.length === 0 ? (
        <p className="mt-3 text-sm text-amber-800" role="status">
          Tài khoản chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ trước khi đặt hàng.
        </p>
      ) : (
        <>
          <select
            id="delivery-address"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100"
          >
            <option value="">Chọn địa chỉ nhận hàng</option>
            {addresses.map((address) => (
              <option key={address.id} value={address.id}>
                {address.recipient_name} — {address.address}
                {address.is_default ? " (Mặc định)" : ""}
              </option>
            ))}
          </select>
          {selectedAddress && (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <p className="font-bold text-slate-900">{selectedAddress.recipient_name}</p>
              <p className="mt-1">{selectedAddress.phone}</p>
              <p className="mt-1">{selectedAddress.address}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
