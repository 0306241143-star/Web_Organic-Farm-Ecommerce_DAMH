import { CheckCircle2, ClipboardList, Plus, Sprout, X } from "lucide-react";
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
  return (
    <div className={`lg:col-span-5 space-y-4 ${mobileTab === "plots" ? "hidden lg:block" : "block"}`}>
      {/* Mobile Back Button to return to Plots list */}
      <div className="lg:hidden flex items-center justify-between pb-1">
        <button
          type="button"
          onClick={() => setMobileTab("plots")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 shadow-xs hover:bg-slate-50 transition-colors"
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
        /* Quieter, calm empty guide state enforcing plot selection */
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center min-h-[460px]">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 border border-emerald-100/80 shadow-inner">
            <Sprout className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            Nhật Ký Canh Tác Theo Mốc
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
            Vui lòng nhấp chọn một <strong>lô canh tác</strong> từ danh sách mùa vụ bên trái để xem toàn bộ dòng thời gian nhật ký chăm sóc, bón phân, tưới tiêu và hình ảnh thực địa theo từng mốc.
          </p>

          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 max-w-xs text-left space-y-2">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Quy tắc nhật ký theo lô:
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Mỗi lô đất được cấp mã nhật ký riêng biệt để liên kết mã QR truy xuất nguồn gốc nông sản VietGAP & Hữu cơ khi sản phẩm xuất xưởng.
            </p>
            <div className="pt-2 border-t border-slate-200/50 text-[11px] text-slate-400">
              Tổng số lô sẵn sàng: <strong>{allPlots.length} lô</strong>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected Plot Header Summary */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-300 ring-2 ring-emerald-500/10 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedPlot.status === "Dang_canh_tac" ? "Đang trồng" : "Đã thu hoạch"}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedPlot.season_name}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-600" />
                  {selectedPlot.plot_name}
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  {selectedPlot.product_name || "Nông sản"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPlot(null);
                  setLogs([]);
                }}
                className="px-2.5 py-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                title="Đóng xem nhật ký lô này"
              >
                <X className="w-4 h-4" />
                <span>Bỏ chọn</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div>
                Diện tích lô: <strong className="text-slate-900 font-bold">{selectedPlot.area_m2} m²</strong>
              </div>
              <div>
                Ngày gieo: <strong className="text-slate-900 font-bold">{selectedPlot.planting_date}</strong>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                Đã ghi nhận <strong>{logs.length}</strong> mốc nhật ký
              </span>
              <button
                type="button"
                onClick={() => setIsAddLogOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Ghi nhật ký cho lô này
              </button>
            </div>
          </div>

          {/* Timeline Component */}
          <FarmingLogTimeline
            logs={logs}
            loading={logsLoading}
            onDeleteLog={handleDeleteLog}
            selectedPlot={selectedPlot}
            onCreateBatch={handleOpenCreateBatchFromLog}
          />
        </div>
      )}
    </div>
  );
}
