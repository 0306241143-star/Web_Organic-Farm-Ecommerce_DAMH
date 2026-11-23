import { CheckCircle2, ChevronRight, Pencil, Plus, Sprout, Trash2 } from "lucide-react";

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
        /* Danh sách lô dạng List gọn gàng */
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
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
                className={`px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors cursor-pointer group ${
                  isSelected
                    ? "bg-emerald-50/90 border-l-[3px] border-l-emerald-600"
                    : "bg-white hover:bg-slate-50/90 border-l-[3px] border-l-transparent"
                }`}
              >
                {/* Cột trái: Icon + Tên lô + Nông sản + Thông số nhanh */}
                <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 group-hover:bg-emerald-100"
                    }`}
                  >
                    <Sprout className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                        {plot.plot_name}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">
                        • {plot.product_name || "Nông sản"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                          plot.status === "Dang_canh_tac"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {plot.status === "Dang_canh_tac" ? "Đang trồng" : "Đã thu hoạch"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                      <span>
                        Diện tích: <strong className="text-slate-700">{plot.area_m2} m²</strong>
                      </span>
                      <span>
                        Gieo: <strong className="text-slate-700">{plot.planting_date}</strong>
                      </span>
                      {plot.latest_activity && (
                        <span className="truncate max-w-[230px] text-slate-500">
                          • Mốc gần nhất: <strong className="text-emerald-800">{plot.latest_activity.date}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Cột phải: Huy hiệu đang xem & Các nút thao tác nhanh */}
                <div
                  className="flex items-center justify-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectPlot(plot)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-slate-600 hover:text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Đang xem</span>
                      </>
                    ) : (
                      <>
                        <span>Nhật ký</span>
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlot(plot);
                      fetchLogs(plot.id);
                      setIsAddLogOpen(true);
                    }}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 hover:bg-emerald-100/70 rounded-lg transition-colors cursor-pointer"
                    title="Ghi nhật ký canh tác cho lô này"
                  >
                    + Ghi
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditPlot(season, plot)}
                    className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                    title="Chỉnh sửa lô"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlot(season.id, plot)}
                    className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Xóa lô"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}