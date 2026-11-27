import { Award, Clock, PackageCheck, ShieldCheck } from "lucide-react";

export default function CertificateStatCards({ stats }) {
  // Tổng hợp các chỉ số chứng nhận để đánh giá tình trạng hồ sơ và nhu cầu gia hạn.
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tổng Số Hồ Sơ</span>
          <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
            <Award className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
          {stats.total}
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">Đã Gắn Lô Hàng</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <PackageCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
          {stats.batch_attached}
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">Còn Hiệu Lực</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
          {stats.valid}
        </div>
      </div>

      <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-amber-800">Cần Gia Hạn</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight tabular-nums">
          {stats.expiring_soon + stats.expired}
        </div>
      </div>
    </div>
  );
}
