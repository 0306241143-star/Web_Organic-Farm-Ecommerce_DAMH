import { CheckCircle2, Lock, Plus, Scissors, Sprout, X } from "lucide-react";
import FarmingLogTimeline from "../FarmingLogTimeline";

export default function PlotTimelinePanel({
  selectedPlot,
  setSelectedPlot,
  setLogs,
  logs,
  logsLoading,
  mobileTab,
  setMobileTab,
  allPlots,
  setIsAddLogOpen,
  handleDeleteLog,
  handleOpenCreateBatchFromLog,
}) {
  const isHarvested = selectedPlot?.status === "Da_thu_hoach";

  return (
    <div
      className={`lg:col-span-5 min-w-0 flex flex-col h-full min-h-0 gap-3 ${
        mobileTab === "plots" ? "hidden lg:flex" : "flex"
      }`}
    >
      {/* Mobile Back Button */}
      <div className="lg:hidden flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab("plots")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          ← Quay lại danh sách mùa vụ & lô
        </button>
        {selectedPlot && (
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 truncate max-w-[160px]">
            {selectedPlot.plot_name}
          </span>
        )}
      </div>

      {!selectedPlot ? (
        <div className="flex-1 h-full min-h-0 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
            <Sprout className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            Nhật Ký Canh Tác Theo Mốc
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Nhấp chọn một <strong>lô canh tác</strong> ở danh sách bên trái để xem toàn bộ dòng thời gian chăm sóc và hình ảnh thực địa.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 max-w-xs text-left space-y-1.5">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quy tắc nhật ký theo lô:</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Mỗi lô đất được cấp mã nhật ký riêng biệt để liên kết mã QR truy xuất nguồn gốc nông sản khi xuất xưởng.
            </p>
            <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-400">
              Tổng số lô sẵn sàng: <strong className="text-slate-600">{allPlots.length} lô</strong>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Thẻ tóm tắt lô đang chọn đứng yên ở đỉnh cột phải */}
          <div className="shrink-0 bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-300 ring-2 ring-emerald-500/10 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      isHarvested
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {isHarvested ? "Đã thu hoạch" : "Đang trồng"}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium truncate">
                    {selectedPlot.season_name}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-1.5 min-w-0">
                  <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedPlot.plot_name}</span>
                </h3>
                <p className="text-xs font-bold text-emerald-700 truncate mt-0.5">
                  {selectedPlot.product_name || "Nông sản"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlot(null);
                  setLogs([]);
                }}
                className="px-2 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer"
                title="Đóng xem nhật ký lô này"
              >
                <X className="w-3.5 h-3.5" />
                <span>Đóng</span>
              </button>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-3 text-slate-600">
                <span>
                  Diện tích: <strong className="text-slate-900">{selectedPlot.area_m2} m²</strong>
                </span>
                <span>
                  Gieo: <strong className="text-slate-900">{selectedPlot.planting_date}</strong>
                </span>
                <span>
                  Mốc: <strong className="text-emerald-700">{logs.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isHarvested ? (
                  <>
                    <span
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-[11px] font-bold inline-flex items-center gap-1.5 select-none cursor-not-allowed"
                      title="Lô này đã hoàn tất thu hoạch"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Đã thu hoạch</span>
                    </span>

                    <span
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-bold inline-flex items-center gap-1.5 select-none cursor-not-allowed"
                      title="Lô đã hoàn tất thu hoạch, không thể ghi thêm nhật ký"
                    >
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Đã khóa nhật ký</span>
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenCreateBatchFromLog &&
                        handleOpenCreateBatchFromLog(selectedPlot)
                      }
                      className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Tạo lô hàng thu hoạch từ lô canh tác này"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Thu hoạch</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddLogOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ghi nhật ký</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Vùng dòng thời gian nhật ký có thanh cuộn dọc độc lập */}
          <div className="flex-1 min-h-0 flex flex-col">
            <FarmingLogTimeline
              logs={logs}
              loading={logsLoading}
              onDeleteLog={handleDeleteLog}
              selectedPlot={selectedPlot}
              onCreateBatch={handleOpenCreateBatchFromLog}
            />
          </div>
        </>
      )}
    </div>
  );
}