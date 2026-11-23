import { CheckCircle2, ChevronRight, Pencil, Sprout, Trash2 } from "lucide-react";

export default function PlotListSection({
  season,
  selectedPlot,
  handleSelectPlot,
  setActiveSeasonForPlot,
  setIsAddPlotOpen,
  setSelectedPlot,
  fetchLogs,
  setIsAddLogOpen,
  handleOpenEditPlot,
  handleDeletePlot,
}) {
  return (
    <>
                {/* Plots Grid */}
                <div className="p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Lô canh tác ({season.plots?.length || 0})</span>
                    <span className="text-[11px] text-slate-400 normal-case">
                      Tổng: <strong>{(season.total_area_m2 || 0).toLocaleString()} m²</strong>
                    </span>
                  </h4>

                  {!season.plots || season.plots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500">Chưa có lô canh tác nào.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSeasonForPlot(season);
                          setIsAddPlotOpen(true);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline mt-1 inline-block"
                      >
                        + Thêm lô
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
                      {season.plots.map((plot) => {
                        const isSelected = selectedPlot?.id === plot.id;

                        return (
                          <div
                            key={plot.id}
                            onClick={() => handleSelectPlot(plot)}
                            className={`p-4 rounded-2xl border transition-all text-left relative flex flex-col justify-between cursor-pointer group ${
                              isSelected
                                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                                : "bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-xs"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                                      isSelected
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200"
                                    }`}
                                  >
                                    <Sprout className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <h5 className="text-xs font-bold text-slate-900 truncate">
                                      {plot.plot_name}
                                    </h5>
                                    <span className="text-[11px] text-emerald-700 font-semibold truncate block">
                                      {plot.product_name || "Nông sản"}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    plot.status === "Dang_canh_tac"
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {plot.status === "Dang_canh_tac" ? "Đang trồng" : "Đã thu hoạch"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 my-2.5 pt-2.5 border-t border-slate-100/90">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="text-slate-400">Diện tích:</span>
                                  <strong className="text-slate-800 font-bold">{plot.area_m2} m²</strong>
                                </div>
                                <div className="flex items-center gap-1 truncate">
                                  <span className="text-slate-400">Gieo:</span>
                                  <strong className="text-slate-800 font-bold">{plot.planting_date}</strong>
                                </div>
                              </div>

                              {plot.latest_activity && (
                                <div className="text-[10px] text-slate-600 bg-slate-50/90 p-2 rounded-xl border border-slate-100 line-clamp-2">
                                  <span className="font-semibold text-emerald-800">Mốc gần nhất:</span>{" "}
                                  <strong>{plot.latest_activity.date}</strong> — {plot.latest_activity.note}
                                </div>
                              )}
                            </div>

                            {/* Actions on Plot */}
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100/90">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0 ${
                                  isSelected
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-slate-600 group-hover:text-emerald-700"
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Đang xem nhật ký
                                  </>
                                ) : (
                                  <>
                                    Xem nhật ký
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </span>

                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlot(plot);
                                    fetchLogs(plot.id);
                                    setIsAddLogOpen(true);
                                  }}
                                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 hover:bg-emerald-100/60 rounded-lg transition-colors cursor-pointer"
                                  title="Thêm nhật ký canh tác cho lô này"
                                >
                                  Ghi nhật ký
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlot(season, plot)}
                                  className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                                  title="Điều chỉnh diện tích & thông tin lô"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlot(season.id, plot)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Xóa lô này"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
    </>
  );
}
