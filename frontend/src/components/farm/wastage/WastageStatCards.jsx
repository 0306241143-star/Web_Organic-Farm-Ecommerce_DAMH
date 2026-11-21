import { PackageCheck, AlertTriangle, Trash2, TrendingDown } from "lucide-react";

export default function WastageStatCards({ batches = [] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activeBatches = batches.filter((b) => Number(b.remaining_quantity ?? b.so_luong_con_lai ?? 0) > 0);

  const alertBatches = activeBatches.filter((b) => {
    const expiry = new Date(b.expiry_date ?? b.han_su_dung);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  });

  const totalImported = batches.reduce((sum, b) => sum + Number(b.initial_quantity ?? b.so_luong_nhap ?? 0), 0);
  const totalWastage = batches.reduce((sum, b) => sum + Number(b.wastage_quantity ?? b.so_luong_hao_hut ?? 0), 0);
  const wastageRate = totalImported > 0 ? ((totalWastage / totalImported) * 100).toFixed(1) : "0.0";

  const cards = [
    {
      label: "LÔ ĐANG LƯU KHO",
      value: activeBatches.length,
      unit: "lô",
      sub: "Còn tồn kho khả dụng",
      icon: PackageCheck,
      tone: "text-[#00450d] bg-emerald-50",
    },
    {
      label: "CẬN HẠN / HẾT HẠN",
      value: alertBatches.length,
      unit: "lô",
      sub: "HSD ≤ 2 ngày (cần kiểm tra)",
      icon: AlertTriangle,
      tone: alertBatches.length > 0 ? "text-rose-700 bg-rose-50" : "text-slate-600 bg-slate-100",
      highlight: alertBatches.length > 0,
    },
    {
      label: "TỔNG XUẤT HỦY / HAO HỤT",
      value: totalWastage.toLocaleString("vi-VN"),
      unit: "đơn vị",
      sub: "Đã trừ khỏi tồn kho thực tế",
      icon: Trash2,
      tone: "text-amber-800 bg-amber-50",
    },
    {
      label: "TỶ LỆ HAO HỤT KHO",
      value: `${wastageRate}%`,
      unit: "",
      sub: Number(wastageRate) <= 5 ? "Đạt chuẩn vận hành (< 5%)" : "Vượt ngưỡng cảnh báo (5%)",
      icon: TrendingDown,
      tone: Number(wastageRate) <= 5 ? "text-emerald-800 bg-emerald-50" : "text-rose-700 bg-rose-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`rounded-2xl border p-4 bg-white shadow-2xs ${
              card.highlight ? "border-rose-300 bg-rose-50/30" : "border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                {card.label}
              </span>
              <span className={`p-2 rounded-xl ${card.tone}`}>
                <Icon className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${card.highlight ? "text-rose-700" : "text-slate-900"}`}>
                {card.value}
              </span>
              {card.unit && <span className="text-xs font-semibold text-slate-500">{card.unit}</span>}
            </div>
            <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}   