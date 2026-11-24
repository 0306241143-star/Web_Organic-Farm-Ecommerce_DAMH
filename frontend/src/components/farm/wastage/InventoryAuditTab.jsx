import { AlertCircle, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";

export default function InventoryAuditTab({
  batches = [],
  totalFilteredCount,
  loading = false,
  onOpenWastageModal,
}) {
  const displayTotal = totalFilteredCount ?? batches.length;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Thanh thông tin giống trang Chứng nhận */}
      {!loading && batches.length > 0 && (
        <div className="px-4 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span>
            Đối chiếu tồn kho thực tế theo hạn sử dụng (FEFO) và lập phiếu xuất hủy hoặc ghi nhận hao hụt.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {displayTotal} lô
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-xs font-medium">Đang tải dữ liệu tồn kho theo lô...</span>
        </div>
      ) : batches.length === 0 ? (
        <div className="py-14 px-4 text-center text-sm text-slate-500">
          Không có lô hàng nào phù hợp điều kiện kiểm kho hiện tại.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Lô hàng & Nông sản</th>
                  <th className="py-3 px-4">Hạn sử dụng</th>
                  <th className="py-3 px-4">Tồn kho sổ sách</th>
                  <th className="py-3 px-4">Đã hao hụt</th>
                  <th className="py-3 px-4">Cảnh báo FEFO</th>
                  <th className="py-3 px-5 text-right">Thao tác kiểm kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {batches.map((batch) => {
                  const unit = batch.product_unit || "kg";
                  const remaining = Number(batch.remaining ?? batch.remaining_quantity ?? 0);
                  const harvested = Number(batch.harvested ?? batch.harvest_quantity ?? 0);
                  const wastage = Number(batch.wastage ?? batch.wastage_total ?? 0);
                  const daysLeft = Number(batch.daysLeft ?? batch.days_until_expiry ?? 0);
                  const health =
                    batch.health ||
                    (daysLeft < 0 ? "expired" : daysLeft <= 2 ? "expiring" : "normal");
                  const percentLeft =
                    harvested > 0 ? Math.round((remaining / harvested) * 100) : 0;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-bold text-slate-900">{batch.product_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/70 font-mono font-semibold text-[11px] text-emerald-800">
                            {batch.batch_code}
                          </span>
                          <span className="text-[11px] text-slate-500">• {batch.plot_name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 tabular-nums">
                        <p className="font-semibold text-slate-800">{batch.expiry_date}</p>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            health === "expired"
                              ? "text-rose-600 font-semibold"
                              : health === "expiring"
                                ? "text-amber-700 font-semibold"
                                : "text-slate-500"
                          }`}
                        >
                          {daysLeft < 0
                            ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                            : daysLeft === 0
                              ? "Hết hạn hôm nay"
                              : `Còn ${daysLeft} ngày`}
                        </p>
                      </td>

                      <td className="py-3.5 px-4 min-w-[170px] tabular-nums">
                        <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                          <span>
                            {remaining} / {harvested} {unit}
                          </span>
                          <span className="text-[11px] text-slate-500">{percentLeft}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              health === "expired"
                                ? "bg-rose-600"
                                : health === "expiring"
                                  ? "bg-amber-500"
                                  : "bg-emerald-600"
                            }`}
                            style={{ width: `${Math.min(100, percentLeft)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-semibold text-amber-800 tabular-nums">
                        {wastage > 0 ? `${wastage} ${unit}` : "0"}
                      </td>

                      <td className="py-3.5 px-4">
                        {health === "expired" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5" /> Quá hạn – Hủy ngay
                          </span>
                        ) : health === "expiring" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5" /> Cận hạn (Đã báo Sales)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đạt chuẩn
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenWastageModal(batch)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            health === "expired"
                              ? "bg-rose-600 text-white hover:bg-rose-700 shadow-2xs"
                              : "border border-slate-200 bg-white text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>
                            {health === "expired" ? "Xuất hủy lô" : "Ghi nhận hao hụt"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100">
            {batches.map((batch) => {
              const unit = batch.product_unit || "kg";
              const remaining = Number(batch.remaining ?? batch.remaining_quantity ?? 0);
              const harvested = Number(batch.harvested ?? batch.harvest_quantity ?? 0);
              const daysLeft = Number(batch.daysLeft ?? batch.days_until_expiry ?? 0);
              const health =
                batch.health ||
                (daysLeft < 0 ? "expired" : daysLeft <= 2 ? "expiring" : "normal");
              const percentLeft =
                harvested > 0 ? Math.round((remaining / harvested) * 100) : 0;

              return (
                <div key={batch.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">
                        {batch.product_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 font-mono text-[11px] text-emerald-800">
                          {batch.batch_code}
                        </span>
                        <span className="text-[11px] text-slate-500">• {batch.plot_name}</span>
                      </div>
                    </div>

                    {health === "expired" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] shrink-0">
                        <AlertCircle className="w-3 h-3" /> Quá hạn
                      </span>
                    ) : health === "expiring" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] shrink-0">
                        <Clock className="w-3 h-3" /> Cận hạn
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] shrink-0">
                        <CheckCircle2 className="w-3 h-3" /> Đạt chuẩn
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Tồn kho sổ sách:</span>
                      <span className="font-bold tabular-nums">
                        {remaining} / {harvested} {unit} ({percentLeft}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          health === "expired"
                            ? "bg-rose-600"
                            : health === "expiring"
                              ? "bg-amber-500"
                              : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.min(100, percentLeft)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>HSD: {batch.expiry_date}</span>
                      <span
                        className={`font-semibold ${
                          daysLeft < 0
                            ? "text-rose-600"
                            : daysLeft <= 2
                              ? "text-amber-700"
                              : "text-slate-600"
                        }`}
                      >
                        {daysLeft < 0
                          ? `Quá hạn ${Math.abs(daysLeft)} ngày`
                          : daysLeft === 0
                            ? "Hết hạn hôm nay"
                            : `Còn ${daysLeft} ngày`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenWastageModal(batch)}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      health === "expired"
                        ? "bg-rose-600 text-white hover:bg-rose-700"
                        : "border border-slate-200 bg-white text-slate-800 hover:border-emerald-600 hover:text-emerald-800"
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>
                      {health === "expired" ? "Xuất Hủy Lô Quá Hạn" : "Ghi Nhận Hao Hụt"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}