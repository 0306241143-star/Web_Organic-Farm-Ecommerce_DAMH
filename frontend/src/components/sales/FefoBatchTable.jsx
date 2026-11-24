import {
  Calendar,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  PackageSearch,
} from "lucide-react";
import { Link } from "react-router-dom";

const STATUS_LABELS = {
  Con_hang: "Còn hàng",
  Sap_het_han: "Cận hạn",
  Het_hang: "Hết hàng",
  Da_huy: "Đã hủy",
};

export default function FefoBatchTable({ batches = [], loading = false }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Sub-header gợi ý quy tắc FEFO */}
      {!loading && batches.length > 0 && (
        <div className="px-4 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span>
            Danh sách sắp xếp tự động theo nguyên tắc FEFO (lô có hạn sử dụng gần nhất đứng trước).
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {batches.length} lô
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách tồn kho FEFO...
          </p>
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <PackageSearch className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">
            Không tìm thấy lô hàng phù hợp
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm khác.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table
              aria-label="Tồn kho theo lô FEFO"
              className="w-full text-left border-collapse"
            >
              <thead>
                <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90">
                  <th className="py-3 px-4 sm:px-5">Lô Hàng & Nông Sản</th>
                  <th className="py-3 px-4">Nguồn Canh Tác</th>
                  <th className="py-3 px-4">Thu Hoạch & HSD</th>
                  <th className="py-3 px-4">Tồn Kho Khả Dụng</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {batches.map((batch) => {
                  const expired =
                    batch.days_until_expiry < 0 && batch.remaining_quantity > 0;
                  const initialQty = Number(batch.initial_quantity || 0);
                  const remainQty = Number(batch.remaining_quantity || 0);
                  const percentLeft =
                    initialQty > 0
                      ? Math.min(100, Math.round((remainQty / initialQty) * 100))
                      : 0;

                  const badgeClass = expired
                    ? "bg-red-50 text-red-800 border-red-200"
                    : batch.status === "Con_hang"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : batch.status === "Sap_het_han" || batch.is_expiring_soon
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : batch.status === "Het_hang"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-red-50 text-red-800 border-red-200";

                  const badgeText = expired
                    ? "Quá hạn"
                    : STATUS_LABELS[batch.status] || batch.status;

                  return (
                    <tr
                      key={batch.batch_id}
                      className="transition-colors hover:bg-slate-50/90 group"
                    >
                      <td className="py-3 px-4 sm:px-5">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate">
                            {batch.product_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="font-mono font-semibold text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/70">
                              #LH-{String(batch.batch_id).padStart(4, "0")}
                            </span>
                            {(batch.is_expiring_soon || batch.status === "Sap_het_han") &&
                              !expired && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  <span>
                                    {batch.days_until_expiry === 0
                                      ? "Hết hạn hôm nay"
                                      : `Còn ${batch.days_until_expiry} ngày`}
                                  </span>
                                </span>
                              )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-700 truncate max-w-[180px]">
                          {batch.plot_name || "Lô canh tác tiêu chuẩn"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Đơn vị: {batch.unit || "kg"}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap tabular-nums">
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{batch.harvest_date || "—"}</span>
                        </div>
                        <div
                          className={`text-[11px] font-semibold flex items-center gap-1.5 mt-0.5 ${expired
                              ? "text-red-600"
                              : batch.is_expiring_soon
                                ? "text-amber-700"
                                : "text-slate-700"
                            }`}
                        >
                          <Clock className="w-3.5 h-3.5 shrink-0 opacity-75" />
                          <span>HSD: {batch.expiry_date || "—"}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <div className="flex items-center justify-between gap-2 text-xs mb-1 max-w-[165px]">
                          <span className="font-bold text-slate-800">
                            {remainQty}
                            {initialQty > 0 ? ` / ${initialQty}` : ""}{" "}
                            {batch.unit || ""}
                          </span>
                          {initialQty > 0 && (
                            <span className="text-[10px] text-slate-400">
                              {percentLeft}%
                            </span>
                          )}
                        </div>
                        <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${percentLeft > 40
                                ? "bg-emerald-500"
                                : percentLeft > 15
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                            style={{ width: `${percentLeft}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 sm:px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {batch.is_expiring_soon && !expired && (
                            <Link
                              to={`/sales/flash-sales?batch_id=${batch.batch_id}`}
                              state={{ prefillBatch: batch }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 hover:bg-amber-500 hover:text-white border border-amber-300/70 transition-colors"
                              title="Gán lô này vào form tạo Flash Sale xả hàng"
                            >
                              <Flame className="w-3 h-3" />
                              <span>Xả hàng</span>
                            </Link>
                          )}

                          <span
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${badgeClass}`}
                          >
                            {badgeText}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {batches.map((batch) => {
              const expired =
                batch.days_until_expiry < 0 && batch.remaining_quantity > 0;
              const initialQty = Number(batch.initial_quantity || 0);
              const remainQty = Number(batch.remaining_quantity || 0);
              const percentLeft =
                initialQty > 0
                  ? Math.min(100, Math.round((remainQty / initialQty) * 100))
                  : 0;

              const badgeClass = expired
                ? "bg-red-50 text-red-800 border-red-200"
                : batch.status === "Con_hang"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : batch.status === "Sap_het_han" || batch.is_expiring_soon
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : batch.status === "Het_hang"
                      ? "bg-slate-100 text-slate-600 border-slate-200"
                      : "bg-red-50 text-red-800 border-red-200";

              return (
                <div key={batch.batch_id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                        #LH-{String(batch.batch_id).padStart(4, "0")}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug break-words mt-1">
                        {batch.product_name}
                      </h4>
                      {batch.plot_name && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {batch.plot_name}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeClass}`}
                    >
                      {expired ? "Quá hạn" : STATUS_LABELS[batch.status] || batch.status}
                    </span>
                  </div>

                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Tồn kho khả dụng:</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {remainQty}
                        {initialQty > 0 ? ` / ${initialQty}` : ""} {batch.unit || ""}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${percentLeft > 40
                            ? "bg-emerald-500"
                            : percentLeft > 15
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                        style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Thu hoạch: {batch.harvest_date || "—"}</span>
                      <span
                        className={`font-semibold ${expired
                            ? "text-red-600"
                            : batch.is_expiring_soon
                              ? "text-amber-700"
                              : "text-slate-600"
                          }`}
                      >
                        HSD: {batch.expiry_date || "—"}
                      </span>
                    </div>
                  </div>

                  {batch.is_expiring_soon && !expired && (
                    <div className="flex justify-end">
                      <Link
                        to="/sales/flash-sales"
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Tạo Flash Sale xả lô cận hạn</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}