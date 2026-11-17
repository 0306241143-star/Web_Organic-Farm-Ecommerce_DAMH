/* Farm season and cultivation-log management page. */
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Sprout,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  X,
  Loader2,
  FileText,
  Trash2,
  Pencil,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import FarmingLogTimeline from "../../components/farm/FarmingLogTimeline";
import AddFarmingLogModal from "../../components/farm/modals/AddFarmingLogModal";

export default function SeasonManagePage() {
  const [seasons, setSeasons] = useState([]);
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Modals state
  const [isAddLogOpen, setIsAddLogOpen] = useState(false);
  const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
  const [isAddPlotOpen, setIsAddPlotOpen] = useState(false);
  const [activeSeasonForPlot, setActiveSeasonForPlot] = useState(null);

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

  // Notification Toast
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  };

  // Tải danh sách mùa vụ
  const fetchSeasons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await farmApi.getSeasons();
      const seasonData = res.data?.data || res.data || [];
      setSeasons(Array.isArray(seasonData) ? seasonData : []);
    } catch (err) {
      console.error("Lỗi tải danh sách mùa vụ:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải danh sách nhật ký canh tác (có thể lọc theo lô)
  const fetchLogs = useCallback(async (plotId = null) => {
    try {
      setLogsLoading(true);
      const params = {};
      if (plotId) params.plot_id = plotId;
      const res = await farmApi.getFarmingLogs(params);
      const logData = res.data?.data || res.data || [];
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (err) {
      console.error("Lỗi tải nhật ký canh tác:", err);
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
      console.error("Lỗi tải danh sách nông sản:", err);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
    fetchLogs();
    fetchProducts();
  }, [fetchSeasons, fetchLogs, fetchProducts]);

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
      await farmApi.createSeason({
        name: seasonForm.name.trim(),
        start_date: seasonForm.start_date,
        end_date: seasonForm.end_date || null,
        status: "Dang_dien_ra",
      });
      showToast("Khởi tạo mùa vụ mới thành công!");
      setIsAddSeasonOpen(false);
      setSeasonForm({ name: "", start_date: "", end_date: "" });
      fetchSeasons();
    } catch (err) {
      setSeasonError(err?.response?.data?.message || "Không thể tạo mùa vụ. Vui lòng thử lại.");
    } finally {
      setSeasonSubmitting(false);
    }
  };

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
      await farmApi.createPlot(activeSeasonForPlot.id, {
        product_id: plotForm.product_id,
        plot_name: plotForm.plot_name.trim(),
        area_m2: plotForm.area_m2 ? parseFloat(plotForm.area_m2) : null,
        planting_date: plotForm.planting_date,
      });
      showToast(`Đã thêm lô "${plotForm.plot_name}" vào ${activeSeasonForPlot.name}!`);
      setIsAddPlotOpen(false);
      setPlotForm({ product_id: "", plot_name: "", area_m2: "", planting_date: "" });
      fetchSeasons();
    } catch (err) {
      setPlotError(err?.response?.data?.message || "Không thể thêm lô canh tác. Vui lòng kiểm tra lại.");
    } finally {
      setPlotSubmitting(false);
    }
  };

  // Xử lý khi chọn xem nhật ký 1 lô
  const handleSelectPlot = (plot) => {
    if (selectedPlot?.id === plot.id) {
      setSelectedPlot(null);
      fetchLogs(null);
    } else {
      setSelectedPlot(plot);
      fetchLogs(plot.id);
    }
  };

  // Xóa nhật ký canh tác
  const handleDeleteLog = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi nhật ký này?")) return;
    try {
      await farmApi.deleteFarmingLog(id);
      showToast("Đã xóa nhật ký canh tác.");
      fetchLogs(selectedPlot?.id || null);
    } catch (err) {
      alert("Không thể xóa nhật ký: " + (err?.response?.data?.message || "Lỗi hệ thống"));
    }
  };

  // Xóa mùa vụ
  const handleDeleteSeason = async (season) => {
    const confirmText = season.plots && season.plots.length > 0
      ? `Mùa vụ "${season.name}" hiện đang có ${season.plots.length} lô canh tác. Bạn có chắc chắn muốn xóa không?`
      : `Bạn có chắc chắn muốn xóa mùa vụ "${season.name}" không?`;

    if (!window.confirm(confirmText)) return;

    try {
      await farmApi.deleteSeason(season.id);
      showToast(`Đã xóa mùa vụ "${season.name}" thành công.`);
      fetchSeasons();
      if (selectedPlot?.season_id === season.id) {
        setSelectedPlot(null);
        fetchLogs(null);
      }
    } catch (err) {
      alert("Không thể xóa mùa vụ: " + (err?.response?.data?.message || "Lỗi hệ thống"));
    }
  };

  // Đổi trạng thái mùa vụ (Đang diễn ra <-> Đã kết thúc)
  const handleToggleSeasonStatus = async (season) => {
    const nextStatus = season.status === "Dang_dien_ra" ? "Da_ket_thuc" : "Dang_dien_ra";
    const label = nextStatus === "Da_ket_thuc" ? "kết thúc mùa vụ" : "kích hoạt lại mùa vụ";

    if (!window.confirm(`Bạn có chắc chắn muốn ${label} "${season.name}"?`)) return;

    try {
      await farmApi.updateSeason(season.id, { status: nextStatus });
      showToast(`Đã ${label} thành công!`);
      fetchSeasons();
    } catch (err) {
      alert("Không thể cập nhật trạng thái mùa vụ: " + (err?.response?.data?.message || "Lỗi hệ thống"));
    }
  };

  // Xóa lô canh tác trong mùa vụ
  const handleDeletePlot = async (seasonId, plot) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lô "${plot.plot_name}" không?`)) return;

    try {
      await farmApi.deletePlot(seasonId, plot.id);
      showToast(`Đã xóa lô "${plot.plot_name}".`);
      fetchSeasons();
      if (selectedPlot?.id === plot.id) {
        setSelectedPlot(null);
        fetchLogs(null);
      }
    } catch (err) {
      alert("Không thể xóa lô canh tác: " + (err?.response?.data?.message || "Lỗi hệ thống"));
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
      await farmApi.updatePlot(activeSeasonForPlot.id, editingPlot.id, {
        product_id: editPlotForm.product_id ? parseInt(editPlotForm.product_id, 10) : undefined,
        plot_name: editPlotForm.plot_name.trim(),
        area_m2: areaNum,
        planting_date: editPlotForm.planting_date,
        status: editPlotForm.status,
      });
      showToast(`Đã điều chỉnh diện tích (${areaNum} m²) cho lô "${editPlotForm.plot_name}"!`);
      setIsEditPlotOpen(false);
      fetchSeasons();
    } catch (err) {
      setEditPlotError(err?.response?.data?.message || "Không thể cập nhật lô canh tác. Vui lòng thử lại.");
    } finally {
      setEditPlotSubmitting(false);
    }
  };

  // Thống kê nhanh
  const totalActivePlots = seasons.reduce((acc, s) => acc + (s.active_plots_count || 0), 0);
  const totalArea = seasons.reduce((acc, s) => acc + (s.total_area_m2 || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Quick Stats */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-700/60 rounded-full text-xs font-semibold text-emerald-200 mb-2">
              <Sprout className="w-3.5 h-3.5" />
              Khu Vực Kỹ Thuật & Vận Hành Nông Trại
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quản Lý Mùa Vụ & Nhật Ký Canh Tác
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl mt-1.5">
              Theo dõi tiến độ gieo trồng, kiểm soát diện tích canh tác từng lô và ghi nhận mốc nhật ký chăm sóc (ảnh, video) minh bạch theo tiêu chuẩn Organic & VietGAP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAddSeasonOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Thêm Mùa Vụ Mới
            </button>
            <button
              type="button"
              onClick={() => setIsAddLogOpen(true)}
              className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              Ghi Nhật Ký Canh Tác
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-700/60">
          <div className="bg-emerald-900/40 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="text-[11px] font-medium text-emerald-200">Mùa vụ đang chạy</span>
            <div className="text-xl sm:text-2xl font-bold mt-0.5">
              {seasons.filter((s) => s.status === "Dang_dien_ra").length}
            </div>
          </div>
          <div className="bg-emerald-900/40 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="text-[11px] font-medium text-emerald-200">Lô đang canh tác</span>
            <div className="text-xl sm:text-2xl font-bold mt-0.5">{totalActivePlots} lô</div>
          </div>
          <div className="bg-emerald-900/40 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="text-[11px] font-medium text-emerald-200">Tổng diện tích</span>
            <div className="text-xl sm:text-2xl font-bold mt-0.5">
              {totalArea.toLocaleString()} m²
            </div>
          </div>
          <div className="bg-emerald-900/40 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50">
            <span className="text-[11px] font-medium text-emerald-200">Mốc nhật ký</span>
            <div className="text-xl sm:text-2xl font-bold mt-0.5">{logs.length} mốc</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Season & Plot Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm kiếm mùa vụ canh tác..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                fetchSeasons();
                fetchLogs(selectedPlot?.id || null);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </button>
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
              <h3 className="text-sm font-bold text-slate-700">Chưa tìm thấy mùa vụ nào</h3>
              <p className="text-xs text-slate-500 mt-1">
                Bấm nút &quot;Thêm Mùa Vụ Mới&quot; để thiết lập chu kỳ canh tác cho nông trại.
              </p>
            </div>
          ) : (
            filteredSeasons.map((season) => (
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

                {/* Plots Grid */}
                <div className="p-5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Danh sách các lô canh tác ({season.plots?.length || 0})</span>
                    <span className="text-[11px] text-slate-400 normal-case">
                      Tổng diện tích: <strong>{(season.total_area_m2 || 0).toLocaleString()} m²</strong>
                    </span>
                  </h4>

                  {!season.plots || season.plots.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500">Mùa vụ này chưa có lô canh tác nào.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSeasonForPlot(season);
                          setIsAddPlotOpen(true);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline mt-1 inline-block"
                      >
                        + Thêm lô gieo trồng ngay
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {season.plots.map((plot) => {
                        const isSelected = selectedPlot?.id === plot.id;

                        return (
                          <div
                            key={plot.id}
                            className={`p-3.5 rounded-xl border transition-all text-left relative flex flex-col justify-between ${
                              isSelected
                                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                                : "bg-white border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                                    <Sprout className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-800 line-clamp-1">
                                      {plot.plot_name}
                                    </h5>
                                    <span className="text-[11px] text-emerald-700 font-medium">
                                      {plot.product_name || "Nông sản"}
                                    </span>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                    plot.status === "Dang_canh_tac"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {plot.status === "Dang_canh_tac" ? "Đang trồng" : "Đã thu hoạch"}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 my-2 pt-2 border-t border-slate-100">
                                <div>
                                  Diện tích: <strong>{plot.area_m2} m²</strong>
                                </div>
                                <div>
                                  Gieo: <strong>{plot.planting_date}</strong>
                                </div>
                              </div>

                              {plot.latest_activity && (
                                <div className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-md border border-slate-100 line-clamp-2">
                                  Mốc gần nhất: <strong>{plot.latest_activity.date}</strong> — {plot.latest_activity.note}
                                </div>
                              )}
                            </div>

                            {/* Actions on Plot */}
                            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleSelectPlot(plot)}
                                className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-emerald-700 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {isSelected ? "Đang lọc xem" : "Xem nhật ký"}
                                <ChevronRight className="w-3 h-3" />
                              </button>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPlot(plot);
                                    setIsAddLogOpen(true);
                                  }}
                                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 hover:bg-emerald-50 rounded-md transition-colors"
                                >
                                  + Ghi nhật ký
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditPlot(season, plot)}
                                  className="text-slate-400 hover:text-emerald-700 p-1 rounded hover:bg-emerald-50 transition-colors"
                                  title="Điều chỉnh diện tích & thông tin lô"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlot(season.id, plot)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
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
              </div>
            ))
          )}
        </div>

        {/* Right Column: Farming Log Timeline (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Plot Badge Bar */}
          {selectedPlot && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-emerald-900 font-semibold truncate">
                  Đang lọc lô: <strong>{selectedPlot.plot_name}</strong> ({selectedPlot.product_name})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlot(null);
                  fetchLogs(null);
                }}
                className="text-emerald-700 hover:text-emerald-900 font-bold shrink-0 ml-2"
              >
                ✕ Hủy lọc
              </button>
            </div>
          )}

          {/* Timeline Component */}
          <FarmingLogTimeline
            logs={logs}
            loading={logsLoading}
            onDeleteLog={handleDeleteLog}
            selectedPlot={selectedPlot}
          />
        </div>
      </div>

      {/* Modal: Ghi nhật ký canh tác (AddFarmingLogModal) */}
      <AddFarmingLogModal
        isOpen={isAddLogOpen}
        onClose={() => setIsAddLogOpen(false)}
        onSuccess={() => {
          showToast("Đã lưu nhật ký canh tác thành công!");
          fetchLogs(selectedPlot?.id || null);
          fetchSeasons();
        }}
        plots={allPlots}
        defaultPlotId={selectedPlot?.id || null}
      />

      {/* Modal: Thêm Mùa Vụ Mới */}
      {isAddSeasonOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-200" />
                Thêm Mùa Vụ Canh Tác Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsAddSeasonOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="p-6 space-y-4">
              {seasonError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{seasonError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Mùa Vụ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vụ Đông Xuân 2027 - Khu Nhà Kính C"
                  value={seasonForm.name}
                  onChange={(e) => setSeasonForm({ ...seasonForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày Bắt Đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={seasonForm.start_date}
                    onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày Kết Thúc (Dự kiến)
                  </label>
                  <input
                    type="date"
                    value={seasonForm.end_date}
                    onChange={(e) => setSeasonForm({ ...seasonForm, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddSeasonOpen(false)}
                  disabled={seasonSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={seasonSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {seasonSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu Mùa Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Thêm Lô Canh Tác vào Mùa Vụ */}
      {isAddPlotOpen && activeSeasonForPlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Sprout className="w-5 h-5 text-emerald-200" />
                  Thêm Lô Canh Tác Mới
                </h3>
                <p className="text-xs text-emerald-200">Thuộc: {activeSeasonForPlot.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPlotOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlot} className="p-6 space-y-4">
              {plotError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{plotError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Chọn Loại Nông Sản Gieo Trồng <span className="text-red-500">*</span>
                </label>
                <select
                  value={plotForm.product_id}
                  onChange={(e) => setPlotForm({ ...plotForm, product_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                >
                  <option value="">-- Chọn loại rau / củ / quả --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Lô Canh Tác <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lô B01 - Cải Xoăn Kale"
                  value={plotForm.plot_name}
                  onChange={(e) => setPlotForm({ ...plotForm, plot_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Diện Tích (m²)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="VD: 1200"
                    value={plotForm.area_m2}
                    onChange={(e) => setPlotForm({ ...plotForm, area_m2: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày Gieo Trồng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={plotForm.planting_date}
                    onChange={(e) => setPlotForm({ ...plotForm, planting_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPlotOpen(false)}
                  disabled={plotSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={plotSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {plotSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Thêm Lô
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Điều Chỉnh Diện Tích & Thông Tin Lô Canh Tác */}
      {isEditPlotOpen && editingPlot && activeSeasonForPlot && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-emerald-200" />
                  Điều Chỉnh Diện Tích & Lô Canh Tác
                </h3>
                <p className="text-xs text-emerald-200">Mùa vụ: {activeSeasonForPlot.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPlotOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlot} className="p-6 space-y-4">
              {editPlotError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{editPlotError}</span>
                </div>
              )}

              {/* Ô nhập Diện Tích (Nổi bật) */}
              <div className="p-3.5 bg-emerald-50/70 border-2 border-emerald-500/40 rounded-2xl">
                <label className="block text-xs font-extrabold text-emerald-900 uppercase tracking-wider mb-1">
                  Diện Tích Canh Tác (m²) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="VD: 1500"
                    value={editPlotForm.area_m2}
                    onChange={(e) => setEditPlotForm({ ...editPlotForm, area_m2: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    m²
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1.5">
                  💡 Thay đổi diện tích lô sẽ tự động cập nhật lại tổng diện tích toàn mùa vụ.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên Lô Canh Tác <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editPlotForm.plot_name}
                  onChange={(e) => setEditPlotForm({ ...editPlotForm, plot_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Loại Nông Sản Giống Trồng
                </label>
                <select
                  value={editPlotForm.product_id}
                  onChange={(e) => setEditPlotForm({ ...editPlotForm, product_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                >
                  <option value="">-- Giữ nguyên hoặc chọn loại khác --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Ngày Gieo Trồng
                  </label>
                  <input
                    type="date"
                    value={editPlotForm.planting_date}
                    onChange={(e) => setEditPlotForm({ ...editPlotForm, planting_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng Thái Lô
                  </label>
                  <select
                    value={editPlotForm.status}
                    onChange={(e) => setEditPlotForm({ ...editPlotForm, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  >
                    <option value="Dang_canh_tac">Đang canh tác</option>
                    <option value="Da_thu_hoach">Đã thu hoạch</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditPlotOpen(false)}
                  disabled={editPlotSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editPlotSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {editPlotSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Lưu Điều Chỉnh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
