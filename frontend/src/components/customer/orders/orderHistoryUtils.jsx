/* Hằng số trạng thái, hàm định dạng tiền/ngày và huy hiệu trạng thái cho trang Lịch sử đơn hàng. */
export const ORDER_STATUS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Cho_xac_nhan: "Chờ xác nhận",
  Da_xac_nhan: "Đã xác nhận",
  Dang_giao: "Đang giao",
  Hoan_thanh: "Hoàn thành",
  Da_huy: "Đã hủy",
};

export const ORDER_TYPE = {
  Mua_le: "Mua lẻ",
  Dinh_ky: "Gói định kỳ",
  Giao_bu: "Giao bù",
};

export const SUBSCRIPTION_STATUS = {
  Cho_thanh_toan: "Chờ thanh toán",
  Dang_hoat_dong: "Đang hoạt động",
  Tam_dung: "Tạm ngưng",
  Het_han: "Hết hạn",
  Da_huy: "Đã hủy",
};

export const CLAIM_STATUS = {
  Cho_xu_ly: "Chờ xử lý",
  Dang_xu_ly: "Đang xử lý",
  Da_giai_quyet: "Đã giải quyết",
  Tu_choi: "Không được chấp nhận",
};

export const CLAIM_RESOLUTION = {
  Chua_xac_dinh: "Chưa có kết quả",
  Hoan_tien: "Hoàn tiền",
  Giao_bu: "Giao bù",
  Tu_choi: "Từ chối",
};

export const WEEKDAYS = [
  "",
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
];

export const formatOrderMoney = (value) =>
  `${Math.round(Number(value || 0)).toLocaleString("vi-VN")} đ`;

export const formatOrderDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export const formatOrderDate = (value) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString("vi-VN") : "—";

export function OrderStatusBadge({ status, labels }) {
  const completed = ["Hoan_thanh", "Dang_hoat_dong", "Da_giai_quyet"].includes(status);
  const inactive = ["Da_huy", "Het_han", "Tu_choi"].includes(status);

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
        completed
          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
          : inactive
            ? "bg-slate-100 text-slate-600"
            : "bg-amber-50 text-amber-800 border border-amber-200/70"
      }`}
    >
      {labels[status] || status}
    </span>
  );
}