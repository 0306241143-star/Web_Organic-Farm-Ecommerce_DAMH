import { CheckCircle2, ChevronRight, Pencil, Plus, Sprout, Trash2 } from "lucide-react";

export default function PlotListSection({
  season,
  selectedPlot,
  handleSelectPlot,
  setActiveSeasonForPlot,
  setIsAddPlotOpen,
  handleOpenEditPlot,
  handleDeletePlot,
}) {
  const plots = Array.isArray(season.plots) ? season.plots : [];

  return (
    <div className="p-3.5 sm:p-4 bg-white">
      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
        <span>Danh sách lô canh tác ({plots.length})</span>
        <span className="text-[11px] text-slate-400 normal-case font-medium">
          Tổng diện tích:{" "}
          <strong className="text-slate-700">
            {(season.total_area_m2 || 0).toLocaleString()} m²
          </strong>
        </span>
      </div>

      {plots.length === 0 ? (
        <div className="text-center py-4 px-3 bg-slate-50/80 rounded-xl border border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Mùa vụ này chưa có lô canh tác nào.</p>
          <button
            type="button"
            onClick={() => {
              setActiveSeasonForPlot(season);
              setIsAddPlotOpen(true);
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm lô ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plots.map((plot) => {
            const isSelected = selectedPlot?.id === plot.id;

            return (
              <div
                key={plot.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectPlot(plot)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelectPlot(plot);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-left ${
                  isSelected
                    ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-500/30 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-xs"
                }`}
              >
                {/* Header Card: Icon + Tên lô + Badge trạng thái */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    }`}
                  >
                    <Sprout className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug break-words flex-1 min-w-0">
                        {plot.plot_name}
                      </h4>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          plot.status === "Dang_canh_tac"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {plot.status === "Dang_canh_tac" ? "Đang trồng" : "Đã thu hoạch"}
                      </span>
                    </div>
                    <p className="text-[11.5px] font-semibold text-emerald-700 truncate mt-0.5">
                      {plot.product_name || "Nông sản hữu cơ"}
                    </p>
                  </div>
                </div>

                {/* Thông số nhanh: Diện tích & Ngày gieo */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    Diện tích: <strong className="text-slate-800">{plot.area_m2} m²</strong>
                  </span>
                  <span>
                    Gieo: <strong className="text-slate-800">{plot.planting_date}</strong>
                  </span>
                </div>

                {/* Thanh thao tác dưới đáy card (khớp chính xác giao diện) */}
                <div
                  className="flex items-center justify-between gap-1 pt-2 border-t border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPlot(plot)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "text-emerald-800 font-extrabold bg-emerald-100/80"
                        : "text-slate-600 hover:text-emerald-700 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Đang xem</span>
                      </>
                    ) : (
                      <>
                        <span>Xem nhật ký</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPlot(season, plot)}
                      className="text-slate-400 hover:text-emerald-700 p-1 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                      title="Chỉnh sửa lô"
                      aria-label="Chỉnh sửa lô"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePlot(season.id, plot)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa lô"
                      aria-label="Xóa lô"
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
  );
}