import { Award, Clock, PackageCheck, ShieldCheck } from "lucide-react";

export default function CertificateStatCards({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Tổng Hồ Sơ</span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-800 tabular-nums">
          {stats.total}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Chứng nhận & phiếu kiểm định</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Đã Gắn Lô Hàng</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <PackageCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">
          {stats.batch_attached}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Hiển thị trên hồ sơ truy xuất lô</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Còn Hiệu Lực</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums">
          {stats.valid}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Đạt chuẩn lưu hành & bán hàng</p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Cần Gia Hạn</span>
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-600 tabular-nums">
          {stats.expiring_soon + stats.expired}
        </div>
        <p className="text-[11px] text-amber-700/80 mt-1">
          {stats.expiring_soon} sắp hết hạn · {stats.expired} đã hết hạn
        </p>
      </div>
    </div>
  );
}
