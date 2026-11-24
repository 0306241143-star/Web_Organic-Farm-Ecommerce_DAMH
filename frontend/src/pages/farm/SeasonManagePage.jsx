/* Season, cultivation plot, and real-time farming log management page. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Sprout,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import {
  getApiValidationMessage,
  isApiValidationError,
  notifyApiErrorToast,
} from "../../services/axiosClient";
import {
  confirmGlobalDialog,
  showGlobalToast,
} from "../../components/GlobalToast";
import SeasonListSection from "../../components/farm/seasons/SeasonListSection";
import PlotTimelinePanel from "../../components/farm/seasons/PlotTimelinePanel";
import SeasonFormModal from "../../components/farm/seasons/SeasonFormModal";
import PlotFormModal from "../../components/farm/seasons/PlotFormModal";
import AddFarmingLogModal from "../../components/farm/modals/AddFarmingLogModal";

export default function SeasonManagePage() {
  const navigate = useNavigate();

  // =========================================================================
  // 1. STATE DỮ LIỆU CHÍNH
  // =========================================================================
  const [seasons, setSeasons] = useState(() => farmApi.getCachedSeasons() || []);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(() => !farmApi.getCachedSeasons());
  const [refreshing, setRefreshing] = useState(false);

  // Tìm kiếm & điều hướng Mobile
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileTab, setMobileTab] = useState("plots"); // "plots" | "timeline"

  // Lô canh tác đang chọn để xem Nhật ký bên phải
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // =========================================================================
  // 2. STATE MODALS
  // =========================================================================
  const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    start_date: new Date().toISOString().slice(0, 10),
    end_date: "",
  });
  const [seasonSubmitting, setSeasonSubmitting] = useState(false);
  const [seasonError, setSeasonError] = useState("");

  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [activeSeasonForPlot, setActiveSeasonForPlot] = useState(null);
  const [plotForm, setPlotForm] = useState({
    product_id: "",
    plot_name: "",
    area_m2: "",
    planting_date: new Date().toISOString().slice(0, 10),
  });
  const [plotSubmitting, setPlotSubmitting] = useState(false);
  const [plotError, setPlotError] = useState("");

  const [isEditPlotOpen, setIsEditPlotOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [editPlotForm, setEditPlotForm] = useState({
    product_id: "",
    plot_name: "",
    area_m2: "",
    planting_date: "",
    status: "Dang_canh_tac",
  });
  const [editPlotSubmitting, setEditPlotSubmitting] = useState(false);
  const [editPlotError, setEditPlotError] = useState("");

  const [isAddLogOpen, setIsAddLogOpen] = useState(false);

  // =========================================================================
  // 3. TẢI DỮ LIỆU TỪ API
  // =========================================================================
  const fetchAllData = useCallback(async (isSilent = false, force = false) => {
    const startedAt = Date.now();
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [seasonsRes, productsRes] = await Promise.all([
        farmApi.getSeasons(undefined, force),
        farmApi.getFarmProducts(force),
      ]);

      const seasonList = seasonsRes?.data?.data ?? seasonsRes?.data ?? [];
      const normalizedSeasons = Array.isArray(seasonList) ? seasonList : [];
      setSeasons(normalizedSeasons);

      // Đồng bộ trạng thái lô đang chọn bên phải nếu vừa thu hoạch hoặc cập nhật
      setSelectedPlot((prev) => {
        if (!prev) return null;
        for (const s of normalizedSeasons) {
          const updated = (s.plots || []).find(
            (p) => String(p.id) === String(prev.id)
          );
          if (updated) {
            return { ...updated, season_name: s.name };
          }
        }
        return prev;
      });

      const prodList = productsRes?.data?.data ?? productsRes?.data ?? [];
      setProducts(Array.isArray(prodList) ? prodList : []);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật dữ liệu mùa vụ & canh tác!");
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách mùa vụ.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(seasons.length > 0, false);
  }, [fetchAllData]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = useCallback(async (plotId) => {
    if (!plotId) {
      setLogs([]);
      return;
    }
    setLogsLoading(true);
    try {
      const res = await farmApi.getFarmingLogs({ plot_id: plotId });
      const list = res?.data?.data?.logs ?? res?.data?.data ?? res?.data ?? [];
      setLogs(Array.isArray(list) ? list : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải nhật ký canh tác.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const handleSelectPlot = (plot) => {
    if (!plot) {
      setSelectedPlot(null);
      setLogs([]);
      return;
    }
    const parentSeason = seasons.find((s) =>
      (s.plots || []).some((p) => String(p.id) === String(plot.id))
    );
    setSelectedPlot({
      ...plot,
      season_name: plot.season_name || parentSeason?.name || "",
    });
    setMobileTab("timeline");
    fetchLogs(plot.id);
  };

  // =========================================================================
  // 4. THỐNG KÊ KPI & LỌC DANH SÁCH
  // =========================================================================
  const allPlots = useMemo(() => {
    return seasons.flatMap((s) =>
      (s.plots || []).map((p) => ({
        ...p,
        season_name: s.name,
      }))
    );
  }, [seasons]);

  const kpiStats = useMemo(() => {
    const activeSeasons = seasons.filter((s) => s.status === "Dang_dien_ra").length;
    const activePlots = allPlots.filter((p) => p.status === "Dang_canh_tac").length;
    const totalArea = seasons.reduce(
      (sum, s) =>
        sum +
        (Number(s.total_area_m2) ||
          (s.plots || []).reduce((pSum, p) => pSum + (Number(p.area_m2) || 0), 0)),
      0
    );

    return {
      activeSeasons,
      activePlots,
      totalArea,
      totalPlots: allPlots.length,
    };
  }, [seasons, allPlots]);

  const filteredSeasons = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return seasons;

    return seasons
      .map((season) => {
        if ((season.name || "").toLowerCase().includes(kw)) {
          return season;
        }
        const matchedPlots = (season.plots || []).filter(
          (p) =>
            (p.plot_name || "").toLowerCase().includes(kw) ||
            (p.product_name || "").toLowerCase().includes(kw)
        );
        if (matchedPlots.length > 0) {
          return { ...season, plots: matchedPlots };
        }
        return null;
      })
      .filter(Boolean);
  }, [seasons, searchTerm]);

  // =========================================================================
  // 5. HANDLERS SỬ DỤNG HỘP THOẠI XÁC NHẬN DÙNG CHUNG (confirmGlobalDialog)
  // =========================================================================
  const handleCreateSeason = async (e) => {
    e.preventDefault();
    if (!seasonForm.name.trim()) {
      setSeasonError("Vui lòng nhập tên mùa vụ.");
      return;
    }
    setSeasonSubmitting(true);
    setSeasonError("");

    try {
      await farmApi.createSeason({
        name: seasonForm.name.trim(),
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date || null,
      });
      showGlobalToast("Đã tạo mùa vụ canh tác mới!");
      setIsAddSeasonOpen(false);
      setSeasonForm({
        name: "",
        start_date: new Date().toISOString().slice(0, 10),
        end_date: "",
      });
      fetchAllData(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setSeasonError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể tạo mùa vụ.");
      }
    } finally {
      setSeasonSubmitting(false);
    }
  };

  const handleToggleSeasonStatus = async (season) => {
    const nextStatus =
      season.status === "Dang_dien_ra" ? "Da_ket_thuc" : "Dang_dien_ra";
    const confirmed = await confirmGlobalDialog({
      title:
        nextStatus === "Da_ket_thuc"
          ? "Kết thúc mùa vụ canh tác"
          : "Mở lại mùa vụ canh tác",
      message:
        nextStatus === "Da_ket_thuc"
          ? `Xác nhận kết thúc mùa vụ "${season.name}"?`
          : `Mở lại mùa vụ "${season.name}" để tiếp tục theo dõi?`,
      confirmLabel: nextStatus === "Da_ket_thuc" ? "Kết thúc vụ" : "Mở lại vụ",
      variant: nextStatus === "Da_ket_thuc" ? "warning" : "primary",
    });

    if (!confirmed) return;

    try {
      await farmApi.updateSeason(season.id, {
        name: season.name,
        start_date: season.start_date,
        end_date:
          nextStatus === "Da_ket_thuc"
            ? season.end_date || new Date().toISOString().slice(0, 10)
            : season.end_date || null,
        status: nextStatus,
      });
      showGlobalToast(
        nextStatus === "Da_ket_thuc"
          ? `Đã kết thúc mùa vụ "${season.name}".`
          : `Đã mở lại mùa vụ "${season.name}".`
      );
      fetchAllData(true, true);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể cập nhật trạng thái mùa vụ.");
    }
  };

  const handleDeleteSeason = async (season) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa mùa vụ canh tác",
      message: `Bạn có chắc chắn muốn xóa mùa vụ "${season.name}"?\nThao tác này không thể hoàn tác nếu mùa vụ chưa phát sinh lô thu hoạch.`,
      confirmLabel: "Xóa mùa vụ",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await farmApi.deleteSeason(season.id);
      showGlobalToast(`Đã xóa mùa vụ "${season.name}".`);
      if (
        selectedPlot &&
        (season.plots || []).some((p) => String(p.id) === String(selectedPlot.id))
      ) {
        setSelectedPlot(null);
        setLogs([]);
      }
      fetchAllData(true, true);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa mùa vụ này.");
    }
  };

  const handleCreatePlot = async (e) => {
    e.preventDefault();
    if (!activeSeasonForPlot) return;
    if (!plotForm.product_id || !plotForm.plot_name.trim()) {
      setPlotError("Vui lòng chọn nông sản và nhập tên lô canh tác.");
      return;
    }

    setPlotSubmitting(true);
    setPlotError("");

    try {
      await farmApi.createPlot(activeSeasonForPlot.id, {
        product_id: Number(plotForm.product_id),
        plot_name: plotForm.plot_name.trim(),
        area_m2: plotForm.area_m2 ? Number(plotForm.area_m2) : null,
        planting_date: plotForm.planting_date,
      });
      showGlobalToast("Đã thêm lô canh tác mới!");
      setIsAddPlotOpen(false);
      setPlotForm({
        product_id: "",
        plot_name: "",
        area_m2: "",
        planting_date: new Date().toISOString().slice(0, 10),
      });
      fetchAllData(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setPlotError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể thêm lô canh tác.");
      }
    } finally {
      setPlotSubmitting(false);
    }
  };

  const handleOpenEditPlot = (season, plot) => {
    setActiveSeasonForPlot(season);
    setEditingPlot(plot);
    setEditPlotError("");
    setEditPlotForm({
      product_id: plot.product_id ? String(plot.product_id) : "",
      plot_name: plot.plot_name || "",
      area_m2: plot.area_m2 ?? "",
      planting_date: plot.planting_date || "",
      status: plot.status || "Dang_canh_tac",
    });
    setIsEditPlotOpen(true);
  };

  const handleUpdatePlot = async (e) => {
    e.preventDefault();
    if (!activeSeasonForPlot || !editingPlot) return;

    setEditPlotSubmitting(true);
    setEditPlotError("");

    try {
      await farmApi.updatePlot(activeSeasonForPlot.id, editingPlot.id, {
        product_id: editPlotForm.product_id ? Number(editPlotForm.product_id) : undefined,
        plot_name: editPlotForm.plot_name.trim(),
        area_m2: editPlotForm.area_m2 !== "" ? Number(editPlotForm.area_m2) : null,
        planting_date: editPlotForm.planting_date || undefined,
        status: editPlotForm.status,
      });
      showGlobalToast("Đã cập nhật lô canh tác!");
      setIsEditPlotOpen(false);
      fetchAllData(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setEditPlotError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể cập nhật lô canh tác.");
      }
    } finally {
      setEditPlotSubmitting(false);
    }
  };

  const handleDeletePlot = async (seasonId, plot) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa lô canh tác",
      message: `Xác nhận xóa lô canh tác "${plot.plot_name}" khỏi mùa vụ?\nMọi dữ liệu nhật ký chưa thu hoạch của lô này sẽ bị xóa.`,
      confirmLabel: "Xóa lô canh tác",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await farmApi.deletePlot(seasonId, plot.id);
      showGlobalToast(`Đã xóa lô "${plot.plot_name}".`);
      if (String(selectedPlot?.id) === String(plot.id)) {
        setSelectedPlot(null);
        setLogs([]);
      }
      fetchAllData(true, true);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa lô canh tác.");
    }
  };

  const handleDeleteLog = async (logId) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa bản ghi nhật ký",
      message: "Bạn có chắc chắn muốn xóa bản ghi nhật ký canh tác này không?",
      confirmLabel: "Xóa nhật ký",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await farmApi.deleteFarmingLog(logId);
      showGlobalToast("Đã xóa bản ghi nhật ký.");
      if (selectedPlot) {
        fetchLogs(selectedPlot.id);
      }
      fetchAllData(true, true);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa nhật ký.");
    }
  };

const handleOpenCreateBatchFromLog = (plotOrLog, logDate) => {
    const targetPlotId =
      plotOrLog?.plot_id ?? plotOrLog?.id ?? selectedPlot?.id;
    if (!targetPlotId) return;

    const rawDate = logDate || plotOrLog?.action_time || "";
    const dateParam = rawDate ? `&date=${String(rawDate).slice(0, 10)}` : "";
    navigate(`/farm/batches?plot_id=${targetPlotId}${dateParam}`);
  };
  // =========================================================================
  // 6. GIAO DIỆN CHÍNH (SÁT MÉP TOP & BOTTOM, 2 CỘT CAO BẰNG NHAU)
  // =========================================================================
  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mb-3.5 sm:-mb-6 lg:-mb-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* 6.1 KHỐI HEADER CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-2.5 space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút Làm mới & Thêm Mùa Vụ */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <Sprout className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span>Quản Lý Mùa Vụ & Canh Tác</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchAllData(true, true)}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSeasonError("");
                  setIsAddSeasonOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Mùa Vụ</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: 4 thẻ KPI nhỏ gọn trực quan (2 cột Mobile -> 4 cột Desktop, thiết kế 2 tầng chống dính chữ) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
            <div className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between min-h-[58px]">
              <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Mùa vụ đang chạy
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none mt-1">
                {kpiStats.activeSeasons}{" "}
                <span className="text-xs font-semibold text-slate-500">vụ</span>
              </div>
            </div>

            <div className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 flex flex-col justify-between min-h-[58px]">
              <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-800 truncate">
                Lô đang canh tác
              </span>
              <div className="text-base sm:text-lg font-black text-emerald-700 tabular-nums leading-none mt-1">
                {kpiStats.activePlots}{" "}
                <span className="text-xs font-semibold text-emerald-700/80">lô</span>
              </div>
            </div>

            <div className="p-2.5 sm:px-3 sm:py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between min-h-[58px]">
              <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate">
                Tổng diện tích
              </span>
              <div className="text-base sm:text-lg font-black text-slate-900 tabular-nums leading-none mt-1">
                {kpiStats.totalArea.toLocaleString("vi-VN")}{" "}
                <span className="text-xs font-semibold text-slate-500">m²</span>
              </div>
            </div>

            <div
              className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border flex flex-col justify-between min-h-[58px] transition-colors ${
                selectedPlot
                  ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/40"
                  : "bg-slate-50/80 border-slate-200/80"
              }`}
            >
              <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 truncate">
                {selectedPlot ? "Lô đang chọn" : "Tổng số lô"}
              </span>
              <div className="text-sm sm:text-base font-black text-emerald-800 tabular-nums leading-none mt-1 truncate">
                {selectedPlot ? selectedPlot.plot_name : `${kpiStats.totalPlots} lô`}
              </div>
            </div>
          </div>

          {/* Hàng 3: Segmented Switcher chuyển đổi 2 cột trên Mobile/Tablet (lg:hidden) */}
          <div className="lg:hidden flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => setMobileTab("plots")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                mobileTab === "plots"
                  ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Lô Canh Tác ({kpiStats.totalPlots})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("timeline")}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all text-center cursor-pointer ${
                mobileTab === "timeline"
                  ? "bg-white text-emerald-800 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Nhật Ký {selectedPlot ? `(${selectedPlot.plot_name})` : ""}
            </button>
          </div>
        </div>
      </div>

      {/* 6.2 KHỐI NỘI DUNG 2 CỘT CAO BẰNG NHAU SÁT MÉP DƯỚI */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-3 grid grid-cols-1 lg:grid-cols-12 items-stretch gap-3.5 overflow-hidden">
        <SeasonListSection
          loading={loading}
          filteredSeasons={filteredSeasons}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          mobileTab={mobileTab}
          selectedPlot={selectedPlot}
          handleToggleSeasonStatus={handleToggleSeasonStatus}
          setActiveSeasonForPlot={setActiveSeasonForPlot}
          setIsAddPlotOpen={setIsAddPlotOpen}
          handleDeleteSeason={handleDeleteSeason}
          handleSelectPlot={handleSelectPlot}
          handleOpenEditPlot={handleOpenEditPlot}
          handleDeletePlot={handleDeletePlot}
        />

        <PlotTimelinePanel
          selectedPlot={selectedPlot}
          setSelectedPlot={setSelectedPlot}
          setLogs={setLogs}
          logs={logs}
          logsLoading={logsLoading}
          mobileTab={mobileTab}
          setMobileTab={setMobileTab}
          allPlots={allPlots}
          setIsAddLogOpen={setIsAddLogOpen}
          handleDeleteLog={handleDeleteLog}
          handleOpenCreateBatchFromLog={handleOpenCreateBatchFromLog}
        />
      </div>

      {/* 6.3 MODALS */}
      <SeasonFormModal
        isAddSeasonOpen={isAddSeasonOpen}
        setIsAddSeasonOpen={setIsAddSeasonOpen}
        seasonError={seasonError}
        seasonForm={seasonForm}
        setSeasonForm={setSeasonForm}
        handleCreateSeason={handleCreateSeason}
        seasonSubmitting={seasonSubmitting}
      />

      <PlotFormModal
        isAddPlotOpen={isAddPlotOpen}
        setIsAddPlotOpen={setIsAddPlotOpen}
        activeSeasonForPlot={activeSeasonForPlot}
        plotError={plotError}
        plotForm={plotForm}
        setPlotForm={setPlotForm}
        handleCreatePlot={handleCreatePlot}
        plotSubmitting={plotSubmitting}
        products={products}
        isEditPlotOpen={isEditPlotOpen}
        editingPlot={editingPlot}
        setIsEditPlotOpen={setIsEditPlotOpen}
        editPlotError={editPlotError}
        editPlotForm={editPlotForm}
        setEditPlotForm={setEditPlotForm}
        handleUpdatePlot={handleUpdatePlot}
        editPlotSubmitting={editPlotSubmitting}
      />

      <AddFarmingLogModal
        isOpen={isAddLogOpen}
        onClose={() => setIsAddLogOpen(false)}
        onSuccess={() => {
          showGlobalToast("Đã lưu bản ghi nhật ký canh tác!");
          if (selectedPlot) {
            fetchLogs(selectedPlot.id);
          }
          fetchAllData(true, true);
        }}
        plots={allPlots}
        defaultPlotId={selectedPlot?.status === "Dang_canh_tac" ? selectedPlot.id : null}
      />
    </div>
  );
}