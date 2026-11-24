import { Award, Calendar, ChevronRight, Clock, Loader2, PackageCheck } from "lucide-react";
import BatchFilterBar from "./BatchFilterBar";

export default function BatchTable({
  selectedBatch,
  filteredBatches,
  loading,
  searchTerm,
  statusFilter,
  batches,
  stats,
  setSearchTerm,
  setStatusFilter,
  handleSelectBatch,
}) {
  return (
    <>
          {/* Danh sách Lô hàng */}
          <div
            className={`bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden ${
              selectedBatch ? "xl:col-span-7" : "w-full"
            }`}
          >
            <BatchFilterBar
              batches={batches}
              stats={stats}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />

            {/* Gợi ý chọn dòng */}
            {!loading && filteredBatches.length > 0 && !selectedBatch && (
              <div className="px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
                <span>Bấm chọn vào bất kỳ lô hàng nào bên dưới để xem thông tin chi tiết và bảng thao tác điều khiển.</span>
                <span className="text-emerald-600 font-semibold tabular-nums shrink-0">
                  {filteredBatches.length} lô
                </span>
              </div>
            )}

            {/* Table Content */}
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                <p className="text-xs text-slate-500 font-medium">Đang tải danh sách lô thu hoạch...</p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <PackageCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-700">
                  Chưa có lô hàng nào
                </h4>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 shadow-2xs">
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/95">
                      <th className="py-3.5 px-4 sm:px-5">Lô Hàng & Nông Sản</th>
                      {!selectedBatch && <th className="py-3.5 px-4">Lô Canh Tác</th>}
                      <th className="py-3.5 px-4">Thu Hoạch & HSD</th>
                      <th className="py-3.5 px-4">Tồn Kho</th>
                      <th className="py-3.5 px-4 sm:px-5 text-right">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
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
                          {/* Lô Hàng & Nông Sản */}
                          <td className="py-3.5 px-4 sm:px-5">
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 truncate">
                                {batch.product_name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="font-mono font-semibold text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/70">
                                  {batch.batch_code}
                                </span>
                                {batch.certificates_count > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-white px-1.5 py-0.5 rounded-md border border-emerald-200">
                                    <Award className="w-3 h-3 shrink-0" />
                                    <span className="tabular-nums">{batch.certificates_count}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Lô Canh Tác (hiện khi bảng toàn chiều rộng) */}
                          {!selectedBatch && (
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-700 truncate max-w-[160px]">
                                {batch.plot_name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                                {batch.season_name}
                              </div>
                            </td>
                          )}

                          {/* Thu Hoạch & HSD */}
                          <td className="py-3.5 px-4 whitespace-nowrap tabular-nums">
                            <div className="text-xs text-slate-600 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{batch.harvest_date}</span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>HSD: {batch.expiry_date}</span>
                            </div>
                          </td>

                          {/* Tồn Kho */}
                          <td className="py-3.5 px-4 tabular-nums">
                            <div className="flex items-center justify-between gap-2 text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                {batch.remaining_quantity} / {batch.harvest_quantity} {batch.product_unit}
                              </span>
                              <span className="text-[10px] text-slate-400">{percentLeft}%</span>
                            </div>
                            <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
                          <td className="py-3.5 px-4 sm:px-5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
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
                                className={`w-4 h-4 transition-transform ${
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
              <div className="md:hidden divide-y divide-slate-100 max-h-[calc(100vh-250px)] overflow-y-auto scrollbar-thin">
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
                      className={`p-4 space-y-3 cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-50/80 ring-1 ring-inset ring-emerald-200" : "hover:bg-slate-50"
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

                      <div className="flex items-center justify-end text-xs text-emerald-700 font-bold gap-1 pt-1">
                        <span>{isSelected ? "Đang chọn xem chi tiết" : "Chạm để xem chi tiết & in tem QR"}</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
            )}
          </div>
    </>
  );
}
