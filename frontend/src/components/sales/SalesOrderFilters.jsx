const STATUS_OPTIONS = [
  ["Cho_thanh_toan", "Chờ thanh toán"],
  ["Cho_xac_nhan", "Chờ xác nhận"],
  ["Da_xac_nhan", "Đã xác nhận"],
  ["Dang_giao", "Đang giao"],
  ["Hoan_thanh", "Hoàn thành"],
  ["Da_huy", "Đã hủy"],
];

const PAYMENT_OPTIONS = [
  ["ApiPay", "ApiPay"],
  ["COD", "COD"],
  ["Mien_phi_goi", "Miễn phí gói"],
  ["Giao_bu", "Giao bù"],
];

export default function SalesOrderFilters({
  status,
  paymentMethod,
  onStatusChange,
  onPaymentMethodChange,
}) {
  const selectClassName =
    "w-full rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2.5 text-sm text-[#191c1b] outline-none focus:border-[#006e1c]";

  return (
    <section
      aria-label="Bộ lọc đơn hàng"
      className="grid gap-3 rounded-2xl border border-[#c0c9bb]/40 bg-white p-4 sm:grid-cols-2"
    >
      <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
        Trạng thái đơn hàng
        <select
          className={selectClassName}
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
        Phương thức thanh toán
        <select
          className={selectClassName}
          value={paymentMethod}
          onChange={(event) => onPaymentMethodChange(event.target.value)}
        >
          <option value="">Tất cả phương thức</option>
          {PAYMENT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
