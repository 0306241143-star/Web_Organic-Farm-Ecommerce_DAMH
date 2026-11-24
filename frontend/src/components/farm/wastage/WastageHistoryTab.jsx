import { Droplets, FileWarning, Loader2, SlidersHorizontal } from "lucide-react";

export default function WastageHistoryTab({
  history = [],
  totalFilteredCount,
  loading = false,
}) {
  const displayTotal = totalFilteredCount ?? history.length;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Thanh thông tin giống trang Chứng nhận */}
      {!loading && history.length > 0 && (
        <div className="px-4 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span>
            Sổ theo dõi toàn bộ phiếu xuất hủy, hao hụt tự nhiên và điều chỉnh kiểm kê kho nông trại.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {displayTotal} phiếu
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-xs font-medium">Đang tải sổ biến động kho...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="py-14 px-4 text-center text-sm text-slate-500">
          Chưa có phiếu xuất hủy hoặc điều chỉnh kiểm kho nào được ghi nhận.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Mã phiếu</th>
                  <th className="py-3 px-4">Lô hàng / Nông sản</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Số lượng trừ</th>
                  <th className="py-3 px-4">Lý do ghi nhận</th>
                  <th className="py-3 px-5">Người thực hiện & Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-700">
                      #BDK-{row.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{row.product_name}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/70 text-[11px] font-mono font-semibold text-emerald-800">
                        {row.batch_code}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.type === "Xuat_huy" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                          <FileWarning className="w-3.5 h-3.5" /> {row.type_label || "Xuất hủy"}
                        </span>
                      ) : row.type === "Hao_hut" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                          <Droplets className="w-3.5 h-3.5" /> {row.type_label || "Hao hụt tự nhiên"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                          <SlidersHorizontal className="w-3.5 h-3.5" /> {row.type_label || "Điều chỉnh kho"}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-extrabold text-rose-700 tabular-nums">
                      -{row.quantity} {row.product_unit || "kg"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 max-w-xs">{row.reason}</td>
                    <td className="py-3.5 px-5">
                      <p className="text-xs font-semibold text-slate-800">{row.staff_name}</p>
                      <p className="text-[11px] text-slate-500 tabular-nums">{row.recorded_at}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {history.map((row) => (
              <div key={row.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-500">
                      #BDK-{row.id}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {row.product_name}
                    </h4>
                    <span className="text-[11px] font-mono text-emerald-800">
                      Lô: {row.batch_code}
                    </span>
                  </div>

                  {row.type === "Xuat_huy" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] shrink-0">
                      <FileWarning className="w-3 h-3" /> {row.type_label || "Xuất hủy"}
                    </span>
                  ) : row.type === "Hao_hut" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px] shrink-0">
                      <Droplets className="w-3 h-3" /> {row.type_label || "Hao hụt"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] shrink-0">
                      <SlidersHorizontal className="w-3 h-3" /> {row.type_label || "Điều chỉnh"}
                    </span>
                  )}
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Số lượng giảm trừ:</span>
                    <span className="font-extrabold text-rose-700 tabular-nums">
                      -{row.quantity} {row.product_unit || "kg"}
                    </span>
                  </div>
                  {row.reason && (
                    <div className="text-slate-700 text-xs break-words pt-1 border-t border-slate-200/50">
                      <span className="text-slate-400 font-medium">Lý do:</span> {row.reason}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                    <span>Người ghi: {row.staff_name}</span>
                    <span>{row.recorded_at}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}