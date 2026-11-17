/* Timeline of sowing, fertilizing, watering, and harvest events. */
import React, { useState } from "react";
import {
  Sprout,
  Droplets,
  FlaskConical,
  Scissors,
  ClipboardList,
  Clock,
  User,
  Trash2,
  Image as ImageIcon,
  Video as VideoIcon,
  Eye,
  Filter,
} from "lucide-react";

export default function FarmingLogTimeline({
  logs = [],
  loading = false,
  onDeleteLog,
  selectedPlot = null,
}) {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [previewMedia, setPreviewMedia] = useState(null);

  const getActivityConfig = (type) => {
    switch (type) {
      case "Gieo_hat":
        return {
          icon: Sprout,
          color: "bg-emerald-100 text-emerald-700 border-emerald-300",
          badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "Gieo hạt & Ươm mầm",
        };
      case "Bon_phan":
        return {
          icon: FlaskConical,
          color: "bg-amber-100 text-amber-700 border-amber-300",
          badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
          label: "Bón phân hữu cơ",
        };
      case "Tuoi_tieu":
        return {
          icon: Droplets,
          color: "bg-blue-100 text-blue-700 border-blue-300",
          badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
          label: "Tưới tiêu nước sạch",
        };
      case "Thu_hoach":
        return {
          icon: Scissors,
          color: "bg-purple-100 text-purple-700 border-purple-300",
          badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
          label: "Thu hoạch nông sản",
        };
      default:
        return {
          icon: ClipboardList,
          color: "bg-slate-100 text-slate-700 border-slate-300",
          badgeColor: "bg-slate-50 text-slate-800 border-slate-200",
          label: "Hoạt động canh tác khác",
        };
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (activeFilter === "ALL") return true;
    return log.activity_type === activeFilter;
  });

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-slate-200/80">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-slate-100">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Nhật Ký Canh Tác Theo Mốc</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1 truncate max-w-xs sm:max-w-sm">
            {selectedPlot
              ? `Đang xem: ${selectedPlot.plot_name} • ${selectedPlot.product_name || "Nông sản"}`
              : "Chọn một lô cụ thể để xem dòng thời gian nhật ký"}
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-0.5" />
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "Gieo_hat", label: "Gieo hạt" },
            { id: "Bon_phan", label: "Bón phân" },
            { id: "Tuoi_tieu", label: "Tưới nước" },
            { id: "Thu_hoach", label: "Thu hoạch" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveFilter(item.id)}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
                activeFilter === item.id
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mt-5 sm:mt-6">
        {loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/4" />
                  <div className="h-12 bg-slate-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Sprout className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-slate-700">Chưa có nhật ký nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
              {selectedPlot
                ? `Lô "${selectedPlot.plot_name}" chưa có bản ghi nhật ký nào. Hãy bấm nút "+ Ghi nhật ký cho lô này" để thêm mốc hoạt động đầu tiên (gieo hạt, bón phân, tưới nước) kèm ảnh chụp thực địa.`
                : `Hãy bấm nút "Ghi nhật ký canh tác" để thêm mốc hoạt động đầu tiên (gieo hạt, bón phân, tưới nước) kèm ảnh chụp thực tế.`}
            </p>
          </div>
        ) : (
          <div className="relative pl-5 sm:pl-8 border-l-2 border-emerald-100 space-y-6 sm:space-y-8 ml-3 sm:ml-4">
            {filteredLogs.map((log) => {
              const cfg = getActivityConfig(log.activity_type);
              const Icon = cfg.icon;

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[43px] top-1.5 w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 ${cfg.color} flex items-center justify-center shadow-xs bg-white`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-50 hover:bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-slate-200/70 transition-all">
                    {/* Header: Activity + Time + Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badgeColor}`}
                        >
                          {cfg.label}
                        </span>
                        {log.plot_name && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60 truncate max-w-[140px]">
                            {log.plot_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {log.action_time}
                        </span>
                        {onDeleteLog && (
                          <button
                            type="button"
                            onClick={() => onDeleteLog(log.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                            title="Xóa nhật ký này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Staff signature */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phụ trách: <strong>{log.staff_name || "Kỹ thuật nông trại"}</strong></span>
                    </div>

                    {/* Log Note / Description */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white/90 p-3 sm:p-3.5 rounded-xl border border-slate-200/50">
                      {log.content}
                    </p>

                    {/* Media Attachments */}
                    {log.media && log.media.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200/60">
                        <h5 className="text-[11px] sm:text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Hình ảnh & Video minh chứng thực tế ({log.media.length})</span>
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                          {log.media.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setPreviewMedia(item)}
                              className="relative group/media rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video cursor-pointer"
                            >
                              {item.type === "Video" ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white p-2 text-center">
                                  <VideoIcon className="w-6 h-6 text-purple-400 mb-1" />
                                  <span className="text-[10px] text-slate-300 truncate max-w-full">
                                    {item.note || "Video nhật ký"}
                                  </span>
                                </div>
                              ) : (
                                <img
                                  src={item.url}
                                  alt={item.note || "Ảnh nhật ký"}
                                  className="w-full h-full object-cover group-hover/media:scale-105 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80";
                                  }}
                                />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-5 h-5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Media Modal Lightbox Preview */}
      {previewMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[calc(100dvh-2rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-3 sm:p-4 text-white border-b border-slate-800 shrink-0">
              <span className="text-xs sm:text-sm font-semibold truncate max-w-[80%]">
                {previewMedia.note || "Tệp minh chứng nhật ký canh tác"}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="text-slate-400 hover:text-white text-xs sm:text-sm px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕ Đóng
              </button>
            </div>
            <div className="p-3 sm:p-4 flex-1 overflow-y-auto flex items-center justify-center min-h-0 bg-black/50">
              {previewMedia.type === "Video" ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  className="max-h-[65vh] w-full rounded-xl"
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.note || "Minh chứng"}
                  className="max-h-[65vh] max-w-full object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
