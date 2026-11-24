import { Clock, Layers, PackageCheck, TrendingDown } from "lucide-react";

export default function BatchStatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* Tổng lô */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tổng Lô Thu Hoạch</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {stats.total_batches}
        </div>
      </div>

      {/* Khả dụng */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">Tồn Kho Khả Dụng</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <PackageCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
          {Number(stats.total_available_qty || 0).toLocaleString("vi-VN")}{" "}
          <span className="text-xs font-semibold text-slate-500">kg</span>
        </div>
      </div>

      {/* Cận hạn */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-amber-800">Lô Cận Hạn</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight tabular-nums">
          {stats.expiring_soon_batches}
        </div>
      </div>

      {/* Hết hàng */}
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Đã Xuất Kho</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-700 tracking-tight tabular-nums">
          {stats.depleted_batches}
        </div>
      </div>
    </div>
  );
}
