import { useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import PlotListSection from "./PlotListSection";

export default function SeasonListSection({
  loading,
  filteredSeasons,
  searchTerm,
  setSearchTerm,
  selectedPlot,
  handleToggleSeasonStatus,
  setActiveSeasonForPlot,
  setIsAddPlotOpen,
  handleDeleteSeason,
  handleSelectPlot,
  handleOpenEditPlot,
  handleDeletePlot,
}) {
  const [collapsedSeasons, setCollapsedSeasons] = useState({});

  const toggleSeasonCollapse = (seasonId) => {
    setCollapsedSeasons((prev) => ({
      ...prev,
      [seasonId]: !prev[seasonId],
    }));
  };

  const areAllCollapsed =
    filteredSeasons.length > 0 &&
    filteredSeasons.every((s) => Boolean(collapsedSeasons[s.id]));

  const toggleAllSeasons = () => {
    if (areAllCollapsed) {
      setCollapsedSeasons({});
    } else {
      const next = {};
      filteredSeasons.forEach((s) => {
        next[s.id] = true;
      });
      setCollapsedSeasons(next);
    }
  };

  return (
    <div className="lg:col-span-7 min-w-0 flex flex-col h-full min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Thanh tìm kiếm & nút Thu gọn / Mở tất cả */}
      <div className="p-2.5 sm:p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mùa vụ, lô đất hoặc nông sản..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filteredSeasons.length > 0 && (
          <button
            type="button"
            onClick={toggleAllSeasons}
            className="shrink-0 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            title={areAllCollapsed ? "Mở rộng tất cả mùa vụ" : "Thu gọn tất cả mùa vụ"}
          >
            {areAllCollapsed ? (
              <>
                <ChevronsUpDown className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mở</span>
              </>
            ) : (
              <>
                <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Vùng danh sách mùa vụ cuộn độc lập */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 space-y-3.5 scrollbar-thin">
        {loading ? (
          <div className="space-y-3.5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100 animate-pulse space-y-3"
              >
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                <div className="h-14 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredSeasons.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6">
            <Calendar className="w-11 h-11 text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-700">Chưa tìm thấy mùa vụ nào</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bấm nút &quot;Thêm Mùa Vụ&quot; ở góc trên để khởi tạo chu kỳ canh tác mới.
            </p>
          </div>
        ) : (
          filteredSeasons.map((season) => {
            const isCollapsed = Boolean(collapsedSeasons[season.id]);
            const plotsCount = Array.isArray(season.plots) ? season.plots.length : 0;

            return (
              <div
                key={season.id}
                className="rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all hover:border-emerald-300"
              >
                {/* Header thẻ Mùa vụ */}
                <div
                  className={`p-3 sm:px-4 sm:py-3 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    !isCollapsed ? "border-b border-slate-100" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleSeasonCollapse(season.id)}
                      aria-expanded={!isCollapsed}
                      aria-label={
                        isCollapsed ? `Mở rộng ${season.name}` : `Thu gọn ${season.name}`
                      }
                      className="mt-0.5 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-emerald-800 transition-colors cursor-pointer shrink-0"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? "-rotate-90" : "rotate-0"
                        }`}
                      />
                    </button>

                    <div
                      onClick={() => toggleSeasonCollapse(season.id)}
                      className="min-w-0 flex-1 cursor-pointer select-none"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                            season.status === "Dang_dien_ra"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-slate-200 text-slate-700 border-slate-300"
                          }`}
                        >
                          {season.status === "Dang_dien_ra" ? "Đang diễn ra" : "Đã kết thúc"}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                          {season.start_date} {season.end_date ? `→ ${season.end_date}` : ""}
                        </span>
                        {isCollapsed && (
                          <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200/80 tabular-nums whitespace-nowrap">
                            {plotsCount} lô
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                        {season.name}
                      </h3>
                    </div>
                  </div>

                  {/* Thanh thao tác mùa vụ: chia đều độ rộng dễ bấm trên Mobile */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleToggleSeasonStatus(season)}
                      className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap text-center ${
                        season.status === "Dang_dien_ra"
                          ? "bg-slate-200/80 hover:bg-slate-300 text-slate-700"
                          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                      }`}
                    >
                      {season.status === "Dang_dien_ra" ? "Kết thúc vụ" : "Mở lại vụ"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCollapsedSeasons((prev) => ({
                          ...prev,
                          [season.id]: false,
                        }));
                        setActiveSeasonForPlot(season);
                        setIsAddPlotOpen(true);
                      }}
                      className="flex-1 sm:flex-initial px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs inline-flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm Lô</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSeason(season)}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Xóa mùa vụ này"
                      aria-label="Xóa mùa vụ này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Danh sách lô bên trong mùa vụ */}
                {!isCollapsed && (
                  <PlotListSection
                    season={season}
                    selectedPlot={selectedPlot}
                    handleSelectPlot={handleSelectPlot}
                    setActiveSeasonForPlot={setActiveSeasonForPlot}
                    setIsAddPlotOpen={setIsAddPlotOpen}
                    handleOpenEditPlot={handleOpenEditPlot}
                    handleDeletePlot={handleDeletePlot}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}