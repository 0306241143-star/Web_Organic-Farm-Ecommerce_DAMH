import { Power, PowerOff } from "lucide-react";
import Badge from "../common/Badge";

const STATUS_LABELS = {
  Sap_dien_ra: "Tạm tắt / sắp diễn ra",
  Dang_dien_ra: "Đang bật",
  Da_ket_thuc: "Đã kết thúc",
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export default function FlashSaleCampaignCard({ campaign, busy, onToggle }) {
  const active = campaign.status === "Dang_dien_ra";

  return (
    <article className="rounded-2xl border border-[#c0c9bb]/40 bg-white p-3.5 sm:p-5">
      <header className="flex flex-col gap-2.5 sm:gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#00450d] leading-snug">
              #{campaign.campaign_id} · {campaign.title}
            </h2>
            <Badge variant={active ? "success" : campaign.status === "Da_ket_thuc" ? "neutral" : "warning"}>
              {STATUS_LABELS[campaign.status] || campaign.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#5a6357]">
            {formatDate(campaign.start_time)} – {formatDate(campaign.end_time)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggle(campaign, !active)}
          disabled={busy || campaign.status === "Da_ket_thuc"}
          className={`inline-flex min-h-9 w-full sm:w-auto shrink-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
            active
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {busy ? "Đang cập nhật..." : active ? "Tắt chương trình" : "Bật chương trình"}
        </button>
      </header>

      {/* Giao diện Mobile: Thẻ chi tiết gọn không cần cuộn ngang */}
      <div className="mt-3 space-y-2 sm:hidden">
        {campaign.items.map((item) => (
          <div
            key={item.item_id}
            className="rounded-xl border border-[#c0c9bb]/30 bg-[#f8faf8] p-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[#191c1b] leading-snug">
                  {item.product_name}
                </p>
                <span className="text-[11px] text-[#5a6357]">
                  Lô #{item.batch_id}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="block font-bold text-[#006e1c]">
                  {currency.format(item.sale_price)}
                </span>
                <span className="block text-[11px] text-[#5a6357] line-through">
                  {currency.format(item.regular_price)}
                </span>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#c0c9bb]/25 flex items-center justify-between text-[11px] text-[#41493e]">
              <span className="tabular-nums">
                Đã bán:{" "}
                <strong className="text-[#191c1b]">
                  {item.sold_quantity} / {item.limit_quantity} {item.unit || ""}
                </strong>
              </span>
              <span>HSD: {item.expiry_date || "—"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Giao diện Desktop/Tablet: Giữ nguyên bảng gốc */}
      <div className="mt-4 hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-[#5a6357]">
            <tr>
              <th className="pb-2 pr-3">Nông sản / lô</th>
              <th className="pb-2 px-3">Giá giảm</th>
              <th className="pb-2 px-3">Đã bán / quota</th>
              <th className="pb-2 pl-3">Hạn sử dụng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c0c9bb]/20">
            {campaign.items.map((item) => (
              <tr key={item.item_id}>
                <td className="py-2 pr-3">
                  <span className="font-semibold text-[#191c1b]">{item.product_name}</span>
                  <span className="block text-xs text-[#5a6357]">Lô #{item.batch_id}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="font-bold text-[#006e1c]">{currency.format(item.sale_price)}</span>
                  <span className="block text-xs text-[#5a6357] line-through">{currency.format(item.regular_price)}</span>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {item.sold_quantity} / {item.limit_quantity} {item.unit || ""}
                </td>
                <td className="py-2 pl-3 text-[#41493e]">{item.expiry_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}