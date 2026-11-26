import { Award, Calendar, ChevronRight, Clock, Loader2, PackageCheck } from "lucide-react";

export default function BatchTable({
  selectedBatch,
  filteredBatches = [],
  totalFilteredCount,
  loading = false,
  handleSelectBatch,
}) {
  const displayTotal = totalFilteredCount ?? filteredBatches.length;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Gợi ý chọn dòng */}
      {!loading && filteredBatches.length > 0 && !selectedBatch && (
        <div className="px-3.5 sm:px-4 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span className="truncate">
            Bấm chọn vào bất kỳ lô hàng nào bên dưới để xem chi tiết &amp; in tem QR.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {displayTotal} lô
          </span>
        </div>
      )}

      {/* Table Content */}
      {loading ? (
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách lô thu hoạch...
          </p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <PackageCheck className="w-7 h-7" />
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-700">
            Không tìm thấy lô hàng nào
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm khác.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View — co giãn vừa khít khung, không cuộn ngang */}
          <div className="hidden md:block">
            <table className="w-full table-fixed text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90">
                  <th className="py-2.5 px-3.5 w-[35%]">Lô Hàng &amp; Nông Sản</th>
                  <th className="py-2.5 px-2.5 w-[23%]">Thu Hoạch &amp; HSD</th>
                  <th className="py-2.5 px-2.5 w-[22%]">Tồn Kho</th>
                  <th className="py-2.5 px-3.5 w-[20%] text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredBatches.map((batch) => {
                  const percentLeft = Math.min(
                    100,
                    Math.round((batch.remaining_quantity / (batch.harvest_quantity || 1)) * 100)
                  );
                  const isSelected = selectedBatch?.id === batch.id;

                  return (
                    <tr
                      key={batch.id}
                      role="button"
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => handleSelectBatch(batch)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectBatch(batch);
                        }
                      }}
                      className={`transition-colors cursor-pointer group focus:outline-none focus-visible:bg-emerald-50/90 ${
                        isSelected
                          ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-200"
                          : "hover:bg-slate-50/90"
                      }`}
                    >
                      {/* Lô Hàng, Nông Sản & Lô Canh Tác */}
                      <td className="py-2.5 px-3.5 align-top">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 truncate" title={batch.product_name}>
                            {batch.product_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5" title={batch.plot_name}>
                            {batch.plot_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="font-mono font-semibold text-[10.5px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/70 truncate max-w-full">
                              {batch.batch_code}
                            </span>
                            {batch.certificates_count > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                                <Award className="w-3 h-3 shrink-0" />
                                <span className="tabular-nums">{batch.certificates_count}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Thu Hoạch & HSD */}
                      <td className="py-2.5 px-2.5 align-middle whitespace-nowrap tabular-nums">
                        <div className="text-[11.5px] text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{batch.harvest_date}</span>
                        </div>
                        <div
                          className={`text-[11px] font-semibold flex items-center gap-1 mt-1 ${
                            batch.days_until_expiry < 0
                              ? "text-red-600"
                              : batch.days_until_expiry <= 2
                                ? "text-amber-700"
                                : "text-slate-700"
                          }`}
                        >
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>HSD: {batch.expiry_date}</span>
                        </div>
                      </td>

                      {/* Tồn Kho */}
                      <td className="py-2.5 px-2.5 align-middle tabular-nums">
                        <div className="flex items-center justify-between gap-1 text-[11.5px] mb-1">
                          <span className="font-bold text-slate-800 truncate">
                            {batch.remaining_quantity}/{batch.harvest_quantity} {batch.product_unit}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">{percentLeft}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              percentLeft > 40
                                ? "bg-emerald-500"
                                : percentLeft > 15
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${percentLeft}%` }}
                          />
                        </div>
                      </td>

                      {/* Trạng Thái & Mũi tên chọn */}
                      <td className="py-2.5 px-3.5 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <span
                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                              batch.status === "Con_hang"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : batch.status === "Sap_het_han"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : batch.status === "Het_hang"
                                    ? "bg-slate-100 text-slate-600 border-slate-200"
                                    : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {batch.status_label}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isSelected
                                ? "text-emerald-700 translate-x-0.5"
                                : "text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5"
                            }`}
                          />
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
            {filteredBatches.map((batch) => {
              const percentLeft = Math.min(
                100,
                Math.round((batch.remaining_quantity / (batch.harvest_quantity || 1)) * 100)
              );
              const isSelected = selectedBatch?.id === batch.id;

              return (
                <div
                  key={batch.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectBatch(batch)}
                  className={`p-3.5 space-y-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-emerald-50/80 ring-1 ring-inset ring-emerald-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200/80">
                          {batch.batch_code}
                        </span>
                        {batch.certificates_count > 0 && (
                          <span className="p-0.5 px-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 text-[10px] font-bold inline-flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>{batch.certificates_count}</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug break-words">
                        {batch.product_name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {batch.plot_name} · {batch.season_name}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                        batch.status === "Con_hang"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : batch.status === "Sap_het_han"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : batch.status === "Het_hang"
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {batch.status_label}
                    </span>
                  </div>

                  {/* Stock and Dates */}
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Tồn kho khả dụng:</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {batch.remaining_quantity} / {batch.harvest_quantity} {batch.product_unit} ({percentLeft}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percentLeft > 40
                            ? "bg-emerald-500"
                            : percentLeft > 15
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${percentLeft}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Thu hoạch: {batch.harvest_date}</span>
                      <span
                        className={`font-semibold ${
                          batch.days_until_expiry < 0
                            ? "text-red-600"
                            : batch.days_until_expiry <= 2
                              ? "text-amber-700"
                              : "text-slate-600"
                        }`}
                      >
                        HSD: {batch.expiry_date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end text-xs text-emerald-700 font-bold gap-1 pt-0.5">
                    <span>
                      {isSelected
                        ? "Đang chọn xem chi tiết"
                        : "Chạm để xem chi tiết & in tem QR"}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}