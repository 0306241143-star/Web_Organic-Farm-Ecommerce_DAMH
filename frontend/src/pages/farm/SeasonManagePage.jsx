/* Farm season and cultivation-log management page. */
import { useState, useEffect, useCallback } from "react";
import {
  Sprout,
  ClipboardList,
  MapPin,
  Pencil,
  Plus,
  FileText,
  Calendar,
  Layers,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import {
  getApiValidationMessage,
  isApiValidationError,
  notifyApiErrorToast,
} from "../../services/axiosClient";
import AddFarmingLogModal from "../../components/farm/modals/AddFarmingLogModal";
import CreateBatchModal from "../../components/farm/modals/CreateBatchModal";
import SeasonListSection from "../../components/farm/seasons/SeasonListSection";
import SeasonFormModal from "../../components/farm/seasons/SeasonFormModal";
import PlotFormModal from "../../components/farm/seasons/PlotFormModal";
import FarmInfoModal from "../../components/farm/seasons/FarmInfoModal";
import PlotTimelinePanel from "../../components/farm/seasons/PlotTimelinePanel";

export default function SeasonManagePage() {
  // =========================================================================
  // 1. STATE QUẢN LÝ DỮ LIỆU & CACHE (MÙA VỤ, NHẬT KÝ, NÔNG SẢN)
  // =========================================================================
  const [seasons, setSeasons] = useState(() => {
    return farmApi.getCachedSeasons() || [];
  });
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(() => {
    const cached = farmApi.getCachedSeasons();
    return !cached || cached.length === 0;
  });
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [mobileTab, setMobileTab] = useState("plots"); // "plots" | "timeline"

  // =========================================================================
  // 2. STATE HỘP THOẠI (MODALS)
  // =========================================================================
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [activeSeasonForPlot, setActiveSeasonForPlot] = useState(null);

  // Modal tạo lô thu hoạch liên kết từ nhật ký
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false);
  const [batchInitialPlot, setBatchInitialPlot] = useState(null);
  const [batchInitialDate, setBatchInitialDate] = useState(null);
  const [batchInitialLog, setBatchInitialLog] = useState(null);

  const handleOpenCreateBatchFromLog = (log) => {
    const plotObj = allPlots.find((p) => String(p.id) === String(log.plot_id)) || {
      id: log.plot_id,
      plot_name: log.plot_name,
      product_name: log.product_name,
      product_unit: log.product_unit,
      season_name: log.season_name,
    };
    setBatchInitialPlot(plotObj);
    setBatchInitialDate(log.action_time ? log.action_time.slice(0, 10) : null);
    setBatchInitialLog(log);
    setIsCreateBatchOpen(true);
  };

  // Form state thêm mùa vụ mới
  const [seasonForm, setSeasonForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  const [seasonSubmitting, setSeasonSubmitting] = useState(false);
  const [seasonError, setSeasonError] = useState("");

  // Form state thêm lô canh tác mới
  const [plotForm, setPlotForm] = useState({
    product_id: "",
    plot_name: "",
    area_m2: "",
    planting_date: "",
  });
  const [plotSubmitting, setPlotSubmitting] = useState(false);
  const [plotError, setPlotError] = useState("");

  // Form state chỉnh sửa thông tin & diện tích lô canh tác
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

  // Quản lý tên & địa chỉ cơ sở nông trại
  const [farmInfo, setFarmInfo] = useState({
    name: "Nông Trại Xanh Củ Chi",
    address: "Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh",
  });
  const [isEditFarmModalOpen, setIsEditFarmModalOpen] = useState(false);
  const [farmForm, setFarmForm] = useState({
    name: "Nông Trại Xanh Củ Chi",
    address: "Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh",
  });
  const [farmSubmitting, setFarmSubmitting] = useState(false);
  const [farmError, setFarmError] = useState("");

  // =========================================================================
  // 3. API HANDLERS & TẢI DỮ LIỆU
  // =========================================================================
  // Thông báo nổi dùng chung toàn hệ thống (top-center)
  const showToast = (msg, type = "success") => {
    showGlobalToast(msg, type);
  };

  const showApiErrorToast = (fallbackPrefix, err) => {
    notifyApiErrorToast(err, `${fallbackPrefix}: Đã xảy ra lỗi. Vui lòng thử lại.`);
  };

  // Tải thông tin cơ sở nông trại
  const fetchFarmInfo = useCallback(async () => {
    try {
      const res = await farmApi.getFarmInfo();
      const data = res.data?.data;
      if (data) {
        setFarmInfo({
          name: data.name || "Nông Trại Xanh Củ Chi",
          address: data.address || "Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh",
        });
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải thông tin cơ sở nông trại.");
    }
  }, []);

  // Tải danh sách mùa vụ
  const fetchSeasons = useCallback(async (force = true, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await farmApi.getSeasons(null, force);
      const seasonData = res.data?.data || res.data || [];
      setSeasons(Array.isArray(seasonData) ? seasonData : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách mùa vụ.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Tải danh sách nhật ký canh tác (chỉ khi có lô cụ thể)
  const fetchLogs = useCallback(async (plotId = null) => {
    if (!plotId) {
      setLogs([]);
      return;
    }
    try {
      setLogsLoading(true);
      const res = await farmApi.getFarmingLogs({ plot_id: plotId });
      const logData = res.data?.data || res.data || [];
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải nhật ký canh tác.");
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Tải danh mục sản phẩm nông sản
  const fetchProducts = useCallback(async () => {
    try {
      const res = await farmApi.getFarmProducts();
      const prodData = res.data?.data || res.data || [];
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách nông sản.");
    }
  }, []);

  // Khởi tạo: Chỉ tải danh sách mùa vụ, sản phẩm và thông tin cơ sở
  useEffect(() => {
    fetchSeasons();
    fetchProducts();
    fetchFarmInfo();
  }, [fetchSeasons, fetchProducts, fetchFarmInfo]);

  // Lọc mùa vụ theo từ khóa tìm kiếm
  const filteredSeasons = seasons.filter((s) =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Tổng hợp tất cả các lô từ các mùa vụ cho modal chọn
  const allPlots = seasons.flatMap((season) =>
    (season.plots || []).map((plot) => ({
      ...plot,
      season_name: season.name,
    }))
  );

  // Tự động đồng bộ selectedPlot khi allPlots cập nhật
  useEffect(() => {
    if (selectedPlot) {
      const freshPlot = allPlots.find((p) => String(p.id) === String(selectedPlot.id));
      if (freshPlot && freshPlot.status !== selectedPlot.status) {
        setSelectedPlot(freshPlot);
      }
    }
  }, [allPlots, selectedPlot]);

  // =========================================================================
  // 4. EVENT HANDLERS: MÙA VỤ CANH TÁC (TẠO, ĐỔI TRẠNG THÁI, XÓA)
  // =========================================================================
  // Xử lý tạo Mùa vụ mới
  const handleCreateSeason = async (e) => {
    e.preventDefault();
    if (!seasonForm.name.trim() || !seasonForm.start_date) {
      setSeasonError("Vui lòng điền đầy đủ tên mùa vụ và ngày bắt đầu.");
      return;
    }
    setSeasonSubmitting(true);
    setSeasonError("");
    try {
      const res = await farmApi.createSeason({
        name: seasonForm.name.trim(),
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date || null,
        status: "Dang_dien_ra",
      });
      const createdSeason = res?.data?.data ?? res?.data;
      if (createdSeason?.id != null) {
        setSeasons((prev) => [
          {
            ...createdSeason,
            plots: Array.isArray(createdSeason.plots) ? createdSeason.plots : [],
          },
          ...prev.filter((season) => String(season.id) !== String(createdSeason.id)),
        ]);
      }
      showToast("Khởi tạo mùa vụ mới thành công!");
      setIsAddSeasonOpen(false);
      setSeasonForm({ name: "", start_date: "", end_date: "" });
      fetchSeasons(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setSeasonError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể tạo mùa vụ. Vui lòng thử lại.");
      }
    } finally {
      setSeasonSubmitting(false);
    }
  };

  // Đổi trạng thái mùa vụ (Đang diễn ra <-> Đã kết thúc)
  const handleToggleSeasonStatus = async (season) => {
    const nextStatus = season.status === "Dang_dien_ra" ? "Da_ket_thuc" : "Dang_dien_ra";
    const label = nextStatus === "Da_ket_thuc" ? "kết thúc mùa vụ" : "kích hoạt lại mùa vụ";

    const confirmed = await confirmGlobalDialog({
      title: nextStatus === "Da_ket_thuc" ? "Kết thúc mùa vụ?" : "Kích hoạt lại mùa vụ?",
      message: `Bạn có chắc chắn muốn ${label} "${season.name}"?`,
      confirmLabel: nextStatus === "Da_ket_thuc" ? "Kết Thúc Vụ" : "Kích Hoạt Lại",
      variant: nextStatus === "Da_ket_thuc" ? "warning" : "primary",
    });
    if (!confirmed) return;

    try {
      await farmApi.updateSeason(season.id, { status: nextStatus });
      showToast(`Đã ${label} thành công!`);
      setSeasons((prev) =>
        prev.map((item) =>
          String(item.id) === String(season.id)
            ? { ...item, status: nextStatus }
            : item
        )
      );
    } catch (err) {
      showApiErrorToast("Không thể cập nhật trạng thái mùa vụ", err);
    }
  };

  // Xóa mùa vụ
  const handleDeleteSeason = async (season) => {
    const confirmText =
      season.plots && season.plots.length > 0
        ? `Mùa vụ "${season.name}" hiện đang có ${season.plots.length} lô canh tác. Bạn có chắc chắn muốn xóa toàn bộ không?`
        : `Bạn có chắc chắn muốn xóa mùa vụ "${season.name}" không?`;

    const confirmed = await confirmGlobalDialog({
      title: "Xóa mùa vụ canh tác?",
      message: confirmText,
      confirmLabel: "Xóa Mùa Vụ",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await farmApi.deleteSeason(season.id);
      showToast(`Đã xóa mùa vụ "${season.name}" thành công.`);
      setSeasons((prev) =>
        prev.filter((item) => String(item.id) !== String(season.id))
      );
      if (selectedPlot?.season_id === season.id) {
        setSelectedPlot(null);
        setLogs([]);
      }
    } catch (err) {
      showApiErrorToast("Không thể xóa mùa vụ", err);
    }
  };

  // =========================================================================
  // 5. EVENT HANDLERS: LÔ CANH TÁC & NHẬT KÝ (TẠO, SỬA, XÓA, CHỌN)
  // =========================================================================
  // Xử lý tạo Lô canh tác mới
  const handleCreatePlot = async (e) => {
    e.preventDefault();
    if (!plotForm.product_id || !plotForm.plot_name.trim() || !plotForm.planting_date) {
      setPlotError("Vui lòng nhập đầy đủ loại nông sản, tên lô và ngày gieo.");
      return;
    }
    setPlotSubmitting(true);
    setPlotError("");
    try {
      const res = await farmApi.createPlot(activeSeasonForPlot.id, {
        product_id: plotForm.product_id,
        plot_name: plotForm.plot_name.trim(),
        area_m2: plotForm.area_m2 ? parseFloat(plotForm.area_m2) : null,
        planting_date: plotForm.planting_date,
      });
      const createdPlot = res?.data?.data ?? res?.data;
      if (createdPlot?.id != null) {
        setSeasons((prev) =>
          prev.map((season) => {
            if (String(season.id) !== String(activeSeasonForPlot.id)) return season;

            const plots = Array.isArray(season.plots) ? season.plots : [];
            const exists = plots.some((plot) => String(plot.id) === String(createdPlot.id));
            const nextPlots = exists
              ? plots.map((plot) =>
                  String(plot.id) === String(createdPlot.id) ? createdPlot : plot
                )
              : [createdPlot, ...plots];
            const status = createdPlot.status || "Dang_canh_tac";
            const activeCount = Number.isFinite(Number(season.active_plots_count))
              ? Number(season.active_plots_count)
              : plots.filter((plot) => plot.status === "Dang_canh_tac").length;
            const harvestedCount = Number.isFinite(Number(season.harvested_plots_count))
              ? Number(season.harvested_plots_count)
              : plots.filter((plot) => plot.status === "Da_thu_hoach").length;
            const totalArea = Number.isFinite(Number(season.total_area_m2))
              ? Number(season.total_area_m2)
              : plots.reduce((sum, plot) => sum + (Number(plot.area_m2) || 0), 0);

            return {
              ...season,
              plots: nextPlots,
              total_plots:
                (Number.isFinite(Number(season.total_plots))
                  ? Number(season.total_plots)
                  : plots.length) + (exists ? 0 : 1),
              active_plots_count: activeCount + (!exists && status === "Dang_canh_tac" ? 1 : 0),
              harvested_plots_count:
                harvestedCount + (!exists && status === "Da_thu_hoach" ? 1 : 0),
              total_area_m2: totalArea + (!exists ? Number(createdPlot.area_m2) || 0 : 0),
            };
          })
        );
      }
      showToast(`Đã thêm lô "${plotForm.plot_name}" vào ${activeSeasonForPlot.name}!`);
      setIsAddPlotOpen(false);
      setPlotForm({ product_id: "", plot_name: "", area_m2: "", planting_date: "" });
      fetchSeasons(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setPlotError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể thêm lô canh tác. Vui lòng kiểm tra lại.");
      }
    } finally {
      setPlotSubmitting(false);
    }
  };

  // Mở modal điều chỉnh thông tin & diện tích lô
  const handleOpenEditPlot = (season, plot) => {
    setActiveSeasonForPlot(season);
    setEditingPlot(plot);
    setEditPlotForm({
      product_id: plot.product_id ? String(plot.product_id) : "",
      plot_name: plot.plot_name || "",
      area_m2: plot.area_m2 !== undefined && plot.area_m2 !== null ? String(plot.area_m2) : "",
      planting_date: plot.planting_date || "",
      status: plot.status || "Dang_canh_tac",
    });
    setEditPlotError("");
    setIsEditPlotOpen(true);
  };

  // Lưu cập nhật thông tin & diện tích lô
  const handleUpdatePlot = async (e) => {
    e.preventDefault();
    if (!editPlotForm.plot_name.trim() || !editPlotForm.area_m2) {
      setEditPlotError("Vui lòng nhập tên lô và diện tích canh tác.");
      return;
    }
    const areaNum = parseFloat(editPlotForm.area_m2);
    if (isNaN(areaNum) || areaNum <= 0) {
      setEditPlotError("Diện tích canh tác phải lớn hơn 0 m².");
      return;
    }

    setEditPlotSubmitting(true);
    setEditPlotError("");
    try {
      const res = await farmApi.updatePlot(activeSeasonForPlot.id, editingPlot.id, {
        product_id: editPlotForm.product_id ? parseInt(editPlotForm.product_id, 10) : undefined,
        plot_name: editPlotForm.plot_name.trim(),
        area_m2: areaNum,
        planting_date: editPlotForm.planting_date,
        status: editPlotForm.status,
      });
      const updatedPlot = res?.data?.data ?? res?.data;
      if (updatedPlot?.id != null) {
        setSeasons((prev) =>
          prev.map((season) => {
            if (String(season.id) !== String(activeSeasonForPlot.id)) return season;

            const plots = Array.isArray(season.plots) ? season.plots : [];
            const oldPlot = plots.find((plot) => String(plot.id) === String(updatedPlot.id));
            if (!oldPlot) return season;

            const activeCount = Number.isFinite(Number(season.active_plots_count))
              ? Number(season.active_plots_count)
              : plots.filter((plot) => plot.status === "Dang_canh_tac").length;
            const harvestedCount = Number.isFinite(Number(season.harvested_plots_count))
              ? Number(season.harvested_plots_count)
              : plots.filter((plot) => plot.status === "Da_thu_hoach").length;
            const totalArea = Number.isFinite(Number(season.total_area_m2))
              ? Number(season.total_area_m2)
              : plots.reduce((sum, plot) => sum + (Number(plot.area_m2) || 0), 0);

            return {
              ...season,
              plots: plots.map((plot) =>
                String(plot.id) === String(updatedPlot.id) ? updatedPlot : plot
              ),
              active_plots_count:
                activeCount -
                (oldPlot.status === "Dang_canh_tac" ? 1 : 0) +
                (updatedPlot.status === "Dang_canh_tac" ? 1 : 0),
              harvested_plots_count:
                harvestedCount -
                (oldPlot.status === "Da_thu_hoach" ? 1 : 0) +
                (updatedPlot.status === "Da_thu_hoach" ? 1 : 0),
              total_area_m2:
                totalArea -
                (Number(oldPlot.area_m2) || 0) +
                (Number(updatedPlot.area_m2) || 0),
            };
          })
        );
      }
      showToast(`Đã điều chỉnh diện tích (${areaNum} m²) cho lô "${editPlotForm.plot_name}"!`);
      setIsEditPlotOpen(false);
      fetchSeasons(true, true);
    } catch (err) {
      if (isApiValidationError(err)) {
        setEditPlotError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể cập nhật lô canh tác. Vui lòng thử lại.");
      }
    } finally {
      setEditPlotSubmitting(false);
    }
  };

  // Xóa lô canh tác trong mùa vụ
  const handleDeletePlot = async (seasonId, plot) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa lô canh tác?",
      message: `Bạn có chắc chắn muốn xóa lô "${plot.plot_name}"? Dữ liệu nhật ký và lô liên quan sẽ bị gỡ bỏ.`,
      confirmLabel: "Xóa Lô Đất",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await farmApi.deletePlot(seasonId, plot.id);
      showToast(`Đã xóa lô "${plot.plot_name}".`);
      setSeasons((prev) =>
        prev.map((season) => {
          if (String(season.id) !== String(seasonId)) return season;

          const plots = Array.isArray(season.plots) ? season.plots : [];
          const removedPlot = plots.find((item) => String(item.id) === String(plot.id));
          if (!removedPlot) return season;

          const nextPlots = plots.filter((item) => String(item.id) !== String(plot.id));
          const activeCount = Number.isFinite(Number(season.active_plots_count))
            ? Number(season.active_plots_count)
            : plots.filter((item) => item.status === "Dang_canh_tac").length;
          const harvestedCount = Number.isFinite(Number(season.harvested_plots_count))
            ? Number(season.harvested_plots_count)
            : plots.filter((item) => item.status === "Da_thu_hoach").length;
          const totalArea = Number.isFinite(Number(season.total_area_m2))
            ? Number(season.total_area_m2)
            : plots.reduce((sum, item) => sum + (Number(item.area_m2) || 0), 0);

          return {
            ...season,
            plots: nextPlots,
            total_plots: Math.max(
              0,
              (Number.isFinite(Number(season.total_plots))
                ? Number(season.total_plots)
                : plots.length) - 1
            ),
            active_plots_count: Math.max(
              0,
              activeCount - (removedPlot.status === "Dang_canh_tac" ? 1 : 0)
            ),
            harvested_plots_count: Math.max(
              0,
              harvestedCount - (removedPlot.status === "Da_thu_hoach" ? 1 : 0)
            ),
            total_area_m2: Math.max(
              0,
              totalArea - (Number(removedPlot.area_m2) || 0)
            ),
          };
        })
      );
      if (selectedPlot?.id === plot.id) {
        setSelectedPlot(null);
        setLogs([]);
      }
    } catch (err) {
      showApiErrorToast("Không thể xóa lô canh tác", err);
    }
  };

  // Chọn xem nhật ký 1 lô cụ thể
  const handleSelectPlot = (plot) => {
    if (selectedPlot?.id === plot.id) {
      setSelectedPlot(null);
      setLogs([]);
    } else {
      setSelectedPlot(plot);
      fetchLogs(plot.id);
      setMobileTab("timeline"); // Chuyển sang xem timeline tức thì trên di động/tablet
    }
  };

  // Xóa nhật ký canh tác
  const handleDeleteLog = async (id) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa bản ghi nhật ký?",
      message: "Bạn có chắc chắn muốn xóa bản ghi nhật ký canh tác này? Thao tác này không thể hoàn tác.",
      confirmLabel: "Xóa Nhật Ký",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await farmApi.deleteFarmingLog(id);
      showToast("Đã xóa nhật ký canh tác.");
      if (selectedPlot?.id) {
        fetchLogs(selectedPlot.id);
      }
    } catch (err) {
      showApiErrorToast("Không thể xóa nhật ký", err);
    }
  };

  // Cập nhật thông tin cơ sở nông trại
  const handleUpdateFarmInfo = async (e) => {
    e.preventDefault();
    if (!farmForm.address.trim()) {
      setFarmError("Vui lòng nhập địa chỉ cơ sở nông trại.");
      return;
    }
    setFarmSubmitting(true);
    setFarmError("");
    try {
      const res = await farmApi.updateFarmInfo({
        name: farmForm.name.trim(),
        address: farmForm.address.trim(),
      });
      const updated = res.data?.data || farmForm;
      setFarmInfo(updated);
      showToast("Đã cập nhật địa chỉ cơ sở nông trại thành công!");
      setIsEditFarmModalOpen(false);
      window.dispatchEvent(new CustomEvent("farm-info-updated", { detail: updated }));
    } catch (err) {
      if (isApiValidationError(err)) {
        setFarmError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể cập nhật địa chỉ cơ sở.");
      }
    } finally {
      setFarmSubmitting(false);
    }
  };

  // =========================================================================
  // 6. GIAO DIỆN (UI RENDER)
  // =========================================================================
  const totalActivePlots = seasons.reduce((acc, s) => acc + (s.active_plots_count || 0), 0);
  const totalArea = seasons.reduce((acc, s) => acc + (s.total_area_m2 || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 6.1 Top Banner Tiêu Chuẩn Phân Hệ Nông Trại */}
      <div className="bg-gradient-to-br from-white via-[#fcfdfa] to-emerald-50/30 rounded-2xl p-4 sm:p-5 shadow-xs border border-emerald-900/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <button
              type="button"
              onClick={() => {
                setFarmForm({
                  name: farmInfo.name || "Nông Trại Xanh Củ Chi",
                  address: farmInfo.address || "Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh",
                });
                setIsEditFarmModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-full text-[10.5px] font-bold text-emerald-800 transition-colors group cursor-pointer"
              title="Nhấp để cập nhật tên & địa chỉ cơ sở nông trại"
            >
              <MapPin className="w-3 h-3 text-emerald-700 shrink-0" />
              <span className="truncate max-w-[240px]">
                {farmInfo?.address || "Cơ sở #1 • Củ Chi, TP.HCM"}
              </span>
              <Pencil className="w-2.5 h-2.5 text-emerald-500 opacity-70 group-hover:opacity-100 ml-0.5 shrink-0" />
            </button>

            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50/70 rounded-full text-[10.5px] font-bold text-emerald-700 border border-emerald-200/60">
              <Sprout className="w-3 h-3 text-emerald-600" />
              <span>Phân Hệ Nông Trại</span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Quản Lý Mùa Vụ & Canh Tác
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAddSeasonOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs hover:shadow active:scale-[0.98] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Thêm Mùa Vụ</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddLogOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>Ghi Nhật Ký</span>
          </button>
        </div>
      </div>

      {/* 6.2 Thẻ thống kê chỉ số KPI mùa vụ & canh tác */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Mùa vụ đang chạy */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Mùa Vụ Đang Chạy</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
            {seasons.filter((s) => s.status === "Dang_dien_ra").length}{" "}
            <span className="text-xs font-semibold text-slate-500">vụ</span>
          </div>
        </div>

        {/* Lô đang canh tác */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-emerald-800">Lô Đang Canh Tác</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Sprout className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
            {totalActivePlots}{" "}
            <span className="text-xs font-semibold text-slate-500">lô</span>
          </div>
        </div>

        {/* Tổng diện tích */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tổng Diện Tích</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums">
            {totalArea.toLocaleString()}{" "}
            <span className="text-xs font-semibold text-slate-500">m²</span>
          </div>
        </div>

        {/* Lô đang chọn */}
        <div className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              {selectedPlot ? "Lô Đang Chọn" : "Tổng Số Lô Đất"}
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
            {selectedPlot ? (
              <span className="text-emerald-700 text-lg sm:text-xl">{selectedPlot.plot_name}</span>
            ) : (
              <span>
                {allPlots.length}{" "}
                <span className="text-xs font-semibold text-slate-500">lô</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 6.3 Bộ chuyển đổi chế độ xem trên di động (Mobile Segmented Switcher) */}
      <div className="lg:hidden flex items-center p-1 bg-slate-200/80 rounded-2xl border border-slate-300/60 shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab("plots")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "plots"
              ? "bg-white text-emerald-950 shadow-xs ring-1 ring-black/5"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Lô & Mùa Vụ</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700">
            {allPlots.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("timeline")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            mobileTab === "timeline"
              ? "bg-white text-emerald-950 shadow-xs ring-1 ring-black/5"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Nhật Ký Mốc</span>
          {selectedPlot && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          )}
        </button>
      </div>

      {/* 6.4 Bố cục 2 cột chính: Danh sách mùa vụ (trái) và Dòng thời gian nhật ký (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
          setSelectedPlot={setSelectedPlot}
          fetchLogs={fetchLogs}
          setIsAddLogOpen={setIsAddLogOpen}
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

      {/* 6.5 Hộp thoại: Thêm Nhật Ký Canh Tác Mới */}
      <AddFarmingLogModal
        isOpen={isAddLogOpen}
        onClose={() => setIsAddLogOpen(false)}
        onSuccess={() => {
          showToast("Đã lưu nhật ký canh tác thành công!");
          fetchLogs(selectedPlot?.id || null);
          fetchSeasons(true, true);
        }}
        plots={allPlots}
        defaultPlotId={selectedPlot?.id || null}
      />

      {/* 6.6 Hộp thoại: Tạo Lô Hàng Thu Hoạch (Từ mốc thu hoạch) */}
      <CreateBatchModal
        isOpen={isCreateBatchOpen}
        onClose={() => setIsCreateBatchOpen(false)}
        onSuccess={(newBatch) => {
          showToast(`Đã tạo lô hàng thu hoạch #${newBatch?.batch_code || newBatch?.id} thành công!`);
          fetchLogs(selectedPlot?.id || null);
          fetchSeasons(true, true);
        }}
        initialPlot={batchInitialPlot}
        initialHarvestDate={batchInitialDate}
        initialHarvestLog={batchInitialLog}
        plots={allPlots}
      />

      {/* 6.7 Hộp thoại: Thêm Mùa Vụ Canh Tác Mới */}
      <SeasonFormModal
        isAddSeasonOpen={isAddSeasonOpen}
        setIsAddSeasonOpen={setIsAddSeasonOpen}
        seasonError={seasonError}
        seasonForm={seasonForm}
        setSeasonForm={setSeasonForm}
        handleCreateSeason={handleCreateSeason}
        seasonSubmitting={seasonSubmitting}
      />

      {/* 6.8 Hộp thoại: Thêm & Chỉnh Sửa Lô Canh Tác */}
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

      {/* 6.9 Hộp thoại: Cập Nhật Địa Chỉ Cơ Sở Nông Trại */}
      <FarmInfoModal
        isOpen={isEditFarmModalOpen}
        farmForm={farmForm}
        setFarmForm={setFarmForm}
        farmError={farmError}
        farmSubmitting={farmSubmitting}
        onClose={() => setIsEditFarmModalOpen(false)}
        onSubmit={handleUpdateFarmInfo}
      />
    </div>
  );
}
