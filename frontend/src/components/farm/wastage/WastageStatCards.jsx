import { AlertTriangle, Layers, Trash2, TrendingDown } from "lucide-react";

export default function WastageStatCards({ batches = [], disposals = [] }) {
  const totalInStock = batches.length;
  const expiringOrExpired = batches.filter((b) => ["expiring", "expired"].includes(b.status)).length;
  const totalDisposalsCount = disposals.length;
  const totalDisposedQty = disposals.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
  const totalInitialQty = batches.reduce((sum, b) => sum + Number(b.initial_quantity || 0), 0);
  const wastageRate = totalInitialQty > 0 ? ((totalDisposedQty / totalInitialQty) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* Lô đang lưu kho */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Lô Đang Lưu Kho</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <Layers className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {totalInStock}{" "}
          <span className="text-xs font-semibold text-slate-500">lô</span>
        </div>
      </div>

      {/* Cận hạn / Hết hạn */}
      <div className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
        expiringOrExpired > 0 ? "border-rose-300 bg-rose-50/40" : "border-slate-200/80 bg-white"
      } shadow-2xs hover:shadow-xs`}>
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-rose-800">Cận Hạn / Hết Hạn</span>
          <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight tabular-nums">
          {expiringOrExpired}{" "}
          <span className="text-xs font-semibold text-slate-500">lô</span>
        </div>
      </div>

      {/* Tổng xuất hủy */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tổng Xuất Hủy</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {totalDisposalsCount}{" "}
          <span className="text-xs font-semibold text-slate-500">đơn vị</span>
        </div>
      </div>

      {/* Tỷ lệ hao hụt */}
      <div className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tỷ Lệ Hao Hụt</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {wastageRate}%
        </div>
      </div>
    </div>
  );
}
