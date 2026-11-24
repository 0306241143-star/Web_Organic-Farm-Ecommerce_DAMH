import { Search, FileWarning, SlidersHorizontal, Droplets } from "lucide-react";

export default function WastageHistoryTab({
  history = [],
  loading = false,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "", label: "Tất cả phiếu" },
            { id: "Xuat_huy", label: "Xuất hủy hư hỏng / quá hạn" },
            { id: "Hao_hut", label: "Hao hụt tự nhiên" },
            { id: "Dieu_chinh", label: "Điều chỉnh kiểm kê" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTypeFilterChange(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                typeFilter === item.id
                  ? "bg-[#00450d] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Lọc theo mã lô QR hoặc nông sản..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-[#00450d]"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Đang tải sổ biến động kho...</div>
      ) : history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
          Chưa có phiếu xuất hủy hoặc điều chỉnh kiểm kho nào được ghi nhận.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 shadow-2xs">
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                  <th className="py-3 px-4">Mã phiếu</th>
                  <th className="py-3 px-4">Lô hàng / Nông sản</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Số lượng trừ</th>
                  <th className="py-3 px-4">Lý do ghi nhận</th>
                  <th className="py-3 px-4">Người thực hiện & Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">#BDK-{row.id}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{row.product_name}</p>
                      <span className="text-[11px] font-mono text-slate-500">{row.batch_code}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {row.type === "Xuat_huy" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                          <FileWarning className="w-3.5 h-3.5" /> {row.type_label || "Xuất hủy"}
                        </span>
                      ) : row.type === "Hao_hut" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-[11px]">
                          <Droplets className="w-3.5 h-3.5" /> {row.type_label || "Hao hụt tự nhiên"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold text-[11px]">
                          <SlidersHorizontal className="w-3.5 h-3.5" /> {row.type_label || "Điều chỉnh kho"}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-rose-700">
                      -{row.quantity} {row.product_unit || "kg"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs">{row.reason}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{row.staff_name}</p>
                      <p className="text-[11px] text-slate-500">{row.recorded_at}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-3">
            {history.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-500">
                      #BDK-{row.id}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {row.product_name}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Lô: {row.batch_code}
                    </span>
                  </div>

                  {row.type === "Xuat_huy" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] shrink-0">
                      <FileWarning className="w-3 h-3" /> {row.type_label || "Xuất hủy"}
                    </span>
                  ) : row.type === "Hao_hut" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px] shrink-0">
                      <Droplets className="w-3 h-3" /> {row.type_label || "Hao hụt"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10px] shrink-0">
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