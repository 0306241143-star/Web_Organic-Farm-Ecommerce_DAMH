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
    <article className="rounded-2xl border border-[#c0c9bb]/40 bg-white p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-[#00450d]">
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
          className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
            active
              ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          }`}
        >
          {active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          {busy ? "Đang cập nhật..." : active ? "Tắt chương trình" : "Bật chương trình"}
        </button>
      </header>

      <div className="mt-4 overflow-x-auto">
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
