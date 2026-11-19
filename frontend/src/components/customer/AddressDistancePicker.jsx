/* ==========================================================================
 * THÀNH PHẦN CHỌN ĐỊA CHỈ GIAO HÀNG (ADDRESS DISTANCE PICKER)
 * Hiển thị danh sách địa chỉ nhận hàng của khách khi thanh toán
 * và cung cấp liên kết truy cập nhanh đến sổ địa chỉ.
 * ========================================================================== */
import { Link } from "react-router-dom";

export default function AddressDistancePicker({
  addresses,
  value,
  onChange,
  disabled = false,
}) {
  const selectedAddress = addresses.find((address) => String(address.id) === String(value));

  return (
    <section aria-label="Địa chỉ giao hàng" className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <label htmlFor="delivery-address" className="block text-lg font-extrabold text-slate-900">
          Địa chỉ giao hàng
        </label>
        <Link
          to="/rewards?tab=address"
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 hover:underline"
        >
          Quản lý sổ địa chỉ
        </Link>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-900">
            Tài khoản chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ trước khi đặt hàng.
          </p>
          <Link
            to="/rewards?tab=address"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 underline"
          >
            + Thêm địa chỉ nhận hàng mới
          </Link>
        </div>
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
