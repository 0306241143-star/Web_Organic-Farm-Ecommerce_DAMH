import { Clock, Layers, PackageCheck, TrendingDown } from "lucide-react";

export default function BatchStatCards({ stats }) {
  return (
    <>
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Tổng lô */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Lô Thu Hoạch</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-800">
            {stats.total_batches}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Lô thành phẩm đã nhập kho</p>
        </div>

        {/* Khả dụng */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tồn Kho Khả Dụng</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            {Number(stats.total_available_qty || 0).toLocaleString("vi-VN")}{" "}
            <span className="text-xs font-normal text-slate-500">kg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{stats.active_batches} lô đang mở bán</p>
        </div>

        {/* Cận hạn */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Lô Cận Hạn</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            {stats.expiring_soon_batches}
          </div>
          <p className="text-[11px] text-amber-700/80 mt-1">HSD ≤ 48 giờ (Ưu tiên xuất trước)</p>
        </div>

        {/* Hết hàng */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đã Xuất Kho</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-700">
            {stats.depleted_batches}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Đã bán hết hoặc xuất kho</p>
        </div>
      </div>
    </>
  );
}
