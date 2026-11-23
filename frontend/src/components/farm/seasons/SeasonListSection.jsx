import { Calendar, Plus, Search, Trash2 } from "lucide-react";
import PlotListSection from "./PlotListSection";

export default function SeasonListSection({
  loading,
  filteredSeasons,
  searchTerm,
  setSearchTerm,
  mobileTab,
  selectedPlot,
  handleToggleSeasonStatus,
  setActiveSeasonForPlot,
  setIsAddPlotOpen,
  handleDeleteSeason,
  handleSelectPlot,
  setSelectedPlot,
  fetchLogs,
  setIsAddLogOpen,
  handleOpenEditPlot,
  handleDeletePlot,
}) {
  return (
    <>
        {/* Left Column: Season & Plot Cards (7 cols) */}
        <div className={`lg:col-span-7 space-y-5 ${mobileTab === "timeline" ? "hidden lg:block" : "block"}`}>
          {/* Controls Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm mùa vụ, nông sản..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Season Cards List */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 animate-pulse space-y-3">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="h-16 bg-slate-100 rounded-xl" />
                    <div className="h-16 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSeasons.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-xs">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">Chưa có mùa vụ nào</h3>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[calc(100vh-270px)] min-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
              {filteredSeasons.map((season) => (
                <div
                  key={season.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all hover:border-emerald-300"
                >
                {/* Season Card Header */}
                <div className="p-5 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          season.status === "Dang_dien_ra"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-slate-200 text-slate-700 border-slate-300"
                        }`}
                      >
                        {season.status === "Dang_dien_ra" ? "Đang diễn ra" : "Đã kết thúc"}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Bắt đầu: {season.start_date} {season.end_date ? `— Đến: ${season.end_date}` : ""}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-800">{season.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSeasonStatus(season)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                        season.status === "Dang_dien_ra"
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                      }`}
                      title={season.status === "Dang_dien_ra" ? "Đóng / Kết thúc mùa vụ này" : "Mở lại mùa vụ"}
                    >
                      {season.status === "Dang_dien_ra" ? "Kết thúc vụ" : "Mở lại vụ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSeasonForPlot(season);
                        setIsAddPlotOpen(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Thêm Lô
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSeason(season)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa mùa vụ này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <PlotListSection
                  season={season}
                  selectedPlot={selectedPlot}
                  handleSelectPlot={handleSelectPlot}
                  setActiveSeasonForPlot={setActiveSeasonForPlot}
                  setIsAddPlotOpen={setIsAddPlotOpen}
                  setSelectedPlot={setSelectedPlot}
                  fetchLogs={fetchLogs}
                  setIsAddLogOpen={setIsAddLogOpen}
                  handleOpenEditPlot={handleOpenEditPlot}
                  handleDeletePlot={handleDeletePlot}
                />
              </div>
            ))}
            </div>
          )}
        </div>
    </>
  );
}
