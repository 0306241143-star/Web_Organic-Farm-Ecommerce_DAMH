/* Harvest batch management, QR-label traceability, and wastage recording page. */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PackageCheck, Plus, RefreshCw } from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast } from "../../components/GlobalToast";
import {
  getApiValidationMessage,
  isApiValidationError,
  notifyApiErrorToast,
} from "../../services/axiosClient";
import CreateBatchModal from "../../components/farm/modals/CreateBatchModal";
import BatchStatCards from "../../components/farm/batches/BatchStatCards";
import BatchTable from "../../components/farm/batches/BatchTable";
import BatchTraceModal from "../../components/farm/batches/BatchTraceModal";
import BatchDetailPanel from "../../components/farm/batches/BatchDetailPanel";
import BatchWastageModal from "../../components/farm/batches/BatchWastageModal";

export default function BatchHarvestPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data State
  const [batches, setBatches] = useState([]);
  const [stats, setStats] = useState({
    total_batches: 0,
    active_batches: 0,
    expiring_soon_batches: 0,
    depleted_batches: 0,
    total_initial_qty: 0,
    total_available_qty: 0,
  });
  const [eligiblePlots, setEligiblePlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialPlot, setCreateInitialPlot] = useState(null);
  const [createInitialDate, setCreateInitialDate] = useState(null);

  // QR Modal
  const [activeQrBatch, setActiveQrBatch] = useState(null);

  // Selected Batch Info & Control Panel (Master-Detail)
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailBatch, setDetailBatch] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState("certificates"); // "certificates" | "timeline" | "disposals"

  // Record Wastage Modal
  const [wastageBatch, setWastageBatch] = useState(null);
  const [wastageForm, setWastageForm] = useState({
    quantity: "",
    type: "Hao_hut",
    reason: "",
  });
  const [wastageSubmitting, setWastageSubmitting] = useState(false);
  const [wastageError, setWastageError] = useState("");

  // Thông báo nổi dùng chung toàn hệ thống (top-center)
  const showToast = useCallback((msg, type = "success") => {
    showGlobalToast(msg, type);
  }, []);

  // Tải danh sách lô hàng thu hoạch
  const fetchBatches = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getBatches();
      const payload = res.data?.data ?? res.data ?? res ?? {};
      setBatches(payload.batches || []);
      if (payload.stats) {
        setStats(payload.stats);
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách lô thu hoạch.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Tải danh sách lô canh tác đủ điều kiện thu hoạch
  const fetchEligiblePlots = useCallback(async () => {
    try {
      const res = await farmApi.getEligiblePlots();
      const payload = res.data?.data ?? res.data ?? res ?? [];
      setEligiblePlots(Array.isArray(payload) ? payload : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách lô canh tác đủ điều kiện.");
    }
  }, []);

  useEffect(() => {
    fetchBatches();
    fetchEligiblePlots();
  }, [fetchBatches, fetchEligiblePlots]);

  // Tự động mở CreateBatchModal hoặc điền bộ lọc tìm kiếm nếu có query params
  useEffect(() => {
    const shouldCreate = searchParams.get("create");
    const plotId = searchParams.get("plot_id");
    const harvestDate = searchParams.get("harvest_date");
    const searchQ = searchParams.get("search") || searchParams.get("batch_id");

    if (searchQ) {
      setSearchTerm(searchQ);
    }

    if (shouldCreate === "1" || plotId) {
      if (plotId && eligiblePlots.length > 0) {
        const found = eligiblePlots.find((p) => String(p.id) === String(plotId));
        if (found) setCreateInitialPlot(found);
      }
      if (harvestDate) {
        setCreateInitialDate(harvestDate);
      }
      setIsCreateOpen(true);
    }
  }, [searchParams, eligiblePlots]);

  // Lọc danh sách lô
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const kw = searchTerm.toLowerCase();
        const matchId = String(b.id) === kw || `#${b.id}` === kw || `lh-${b.id}` === kw;
        const matchCode = b.batch_code?.toLowerCase().includes(kw);
        const matchPlot = b.plot_name?.toLowerCase().includes(kw);
        const matchProduct = b.product_name?.toLowerCase().includes(kw);
        const matchSeason = b.season_name?.toLowerCase().includes(kw);
        return matchId || matchCode || matchPlot || matchProduct || matchSeason;
      }
      return true;
    });
  }, [batches, statusFilter, searchTerm]);

  // Chọn lô hàng -> mở bảng thông tin & thao tác điều khiển ngay lập tức
  const handleSelectBatch = useCallback(async (batch, forceReload = false) => {
    if (!batch) {
      setSelectedBatch(null);
      setDetailBatch(null);
      return;
    }

    if (!forceReload && selectedBatch?.id === batch.id) {
      setSelectedBatch(null);
      setDetailBatch(null);
      return;
    }

    setSelectedBatch(batch);
    setDetailBatch(null);
    setLoadingDetail(true);
    try {
      const res = await farmApi.getBatchDetail(batch.id);
      const payload = res.data?.data ?? res.data ?? null;
      if (payload) {
        setDetailBatch(payload);
        setSelectedBatch(payload);
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải chi tiết truy xuất nguồn gốc lô hàng.");
    } finally {
      setLoadingDetail(false);
    }
  }, [selectedBatch?.id]);

  // Tự mở bảng thông tin & điều khiển nếu chuyển trang kèm ?search={id} hoặc ?batch_id={id}
  useEffect(() => {
    const targetQ = searchParams.get("batch_id") || searchParams.get("search");
    if (targetQ && batches.length > 0 && !selectedBatch) {
      const matched = batches.find(
        (b) =>
          String(b.id) === String(targetQ) ||
          b.batch_code?.toLowerCase() === String(targetQ).toLowerCase()
      );
      if (matched) {
        handleSelectBatch(matched, true);
      }
    }
  }, [searchParams, batches, selectedBatch, handleSelectBatch]);

  // Mở modal xuất hủy / hao hụt
  const handleOpenWastage = (batch) => {
    setWastageBatch(batch);
    setWastageForm({
      quantity: "",
      type: "Hao_hut",
      reason: "",
    });
    setWastageError("");
  };

  // Gửi lệnh ghi nhận hao hụt
  const handleSubmitWastage = async (e) => {
    e.preventDefault();
    if (!wastageBatch) return;

    const qty = parseFloat(wastageForm.quantity);
    if (!wastageForm.quantity || isNaN(qty) || qty <= 0) {
      setWastageError("Số lượng hao hụt phải lớn hơn 0.");
      return;
    }
    if (qty > wastageBatch.remaining_quantity) {
      setWastageError(
        `Số lượng xuất hủy (${qty} ${wastageBatch.product_unit}) vượt quá tồn kho thực tế (${wastageBatch.remaining_quantity} ${wastageBatch.product_unit}).`
      );
      return;
    }
    if (!wastageForm.reason.trim()) {
      setWastageError("Vui lòng ghi rõ lý do xuất hủy hoặc hao hụt.");
      return;
    }

    setWastageSubmitting(true);
    setWastageError("");

    const affectedBatch = wastageBatch;
    try {
      const res = await farmApi.recordBatchWastage(affectedBatch.id, {
        quantity: qty,
        type: wastageForm.type,
        reason: wastageForm.reason.trim(),
      });
      const updatedBatch = res.data?.data ?? res.data;

      if (updatedBatch?.id) {
        setBatches((prev) =>
          prev.map((batch) =>
            String(batch.id) === String(updatedBatch.id) ? updatedBatch : batch
          )
        );
        setStats((prev) => {
          const availableStatuses = ["Con_hang", "Sap_het_han"];
          const wasAvailable = availableStatuses.includes(affectedBatch.status);
          const isAvailable = availableStatuses.includes(updatedBatch.status);

          return {
            ...prev,
            total_available_qty: Math.max(
              0,
              (Number(prev.total_available_qty) || 0) +
                (isAvailable ? Number(updatedBatch.remaining_quantity) || 0 : 0) -
                (wasAvailable ? Number(affectedBatch.remaining_quantity) || 0 : 0)
            ),
            active_batches: Math.max(
              0,
              (Number(prev.active_batches) || 0) -
                (affectedBatch.status === "Con_hang" ? 1 : 0) +
                (updatedBatch.status === "Con_hang" ? 1 : 0)
            ),
            expiring_soon_batches: Math.max(
              0,
              (Number(prev.expiring_soon_batches) || 0) -
                (affectedBatch.status === "Sap_het_han" ? 1 : 0) +
                (updatedBatch.status === "Sap_het_han" ? 1 : 0)
            ),
            depleted_batches: Math.max(
              0,
              (Number(prev.depleted_batches) || 0) -
                (affectedBatch.status === "Het_hang" ? 1 : 0) +
                (updatedBatch.status === "Het_hang" ? 1 : 0)
            ),
          };
        });
      }

      showToast(`Đã ghi nhận trừ kho ${qty} ${affectedBatch.product_unit} thành công!`);
      setWastageBatch(null);
      if (String(selectedBatch?.id) === String(affectedBatch.id)) {
        handleSelectBatch(updatedBatch || affectedBatch, true);
      }
    } catch (err) {
      if (isApiValidationError(err)) {
        setWastageError(getApiValidationMessage(err));
      } else {
        notifyApiErrorToast(err, "Không thể ghi nhận hao hụt. Vui lòng thử lại.");
      }
    } finally {
      setWastageSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <PackageCheck className="w-4 h-4" />
            <span>Phân Hệ Nông Trại</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Quản Lý Lô Hàng Thu Hoạch
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Theo dõi các lô nông sản sau thu hoạch, kiểm soát hạn sử dụng, in tem QR truy xuất và kiểm kê kho.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchBatches(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateInitialPlot(null);
              setCreateInitialDate(null);
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lô Hàng Thu Hoạch</span>
          </button>
        </div>
      </div>

      <BatchStatCards stats={stats} />

      {/* TAB 1: Danh sách Lô hàng Thu hoạch (Chọn lô -> Hiện thông tin & bảng điều khiển) */}
      <div
        className={
          selectedBatch
            ? "grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
            : "block"
        }
      >
        <BatchTable
          selectedBatch={selectedBatch}
          filteredBatches={filteredBatches}
          loading={loading}
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          batches={batches}
          stats={stats}
          setSearchTerm={setSearchTerm}
          setStatusFilter={setStatusFilter}
          handleSelectBatch={handleSelectBatch}
        />

        <BatchDetailPanel
          selectedBatch={selectedBatch}
          detailBatch={detailBatch}
          loadingDetail={loadingDetail}
          detailSubTab={detailSubTab}
          setDetailSubTab={setDetailSubTab}
          handleSelectBatch={handleSelectBatch}
          setActiveQrBatch={setActiveQrBatch}
          handleOpenWastage={handleOpenWastage}
        />
      </div>

      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setSearchParams({});
        }}
        onSuccess={(newBatch) => {
          showToast(`Đã tạo lô hàng thu hoạch #${newBatch?.batch_code || newBatch?.id} thành công!`);
          if (newBatch?.id) {
            const isAvailable = ["Con_hang", "Sap_het_han"].includes(newBatch.status);
            setBatches((prev) => [
              newBatch,
              ...prev.filter((batch) => String(batch.id) !== String(newBatch.id)),
            ]);
            setStats((prev) => ({
              ...prev,
              total_batches: (Number(prev.total_batches) || 0) + 1,
              active_batches:
                newBatch.status === "Con_hang"
                  ? (Number(prev.active_batches) || 0) + 1
                  : Number(prev.active_batches) || 0,
              expiring_soon_batches:
                newBatch.status === "Sap_het_han"
                  ? (Number(prev.expiring_soon_batches) || 0) + 1
                  : Number(prev.expiring_soon_batches) || 0,
              depleted_batches:
                newBatch.status === "Het_hang"
                  ? (Number(prev.depleted_batches) || 0) + 1
                  : Number(prev.depleted_batches) || 0,
              total_initial_qty:
                (Number(prev.total_initial_qty) || 0) +
                Number(newBatch.harvest_quantity || 0),
              total_available_qty:
                (Number(prev.total_available_qty) || 0) +
                (isAvailable ? Number(newBatch.remaining_quantity || 0) : 0),
            }));
            handleSelectBatch(newBatch, true);
          }
          fetchEligiblePlots();
        }}
        initialPlot={createInitialPlot}
        initialHarvestDate={createInitialDate}
        plots={eligiblePlots}
      />

      <BatchTraceModal
        activeQrBatch={activeQrBatch}
        onClose={() => setActiveQrBatch(null)}
      />

      {/* Modal: Ghi nhận hao hụt / Xuất hủy */}
      <BatchWastageModal
        wastageBatch={wastageBatch}
        wastageForm={wastageForm}
        setWastageForm={setWastageForm}
        wastageError={wastageError}
        wastageSubmitting={wastageSubmitting}
        onClose={() => setWastageBatch(null)}
        onSubmit={handleSubmitWastage}
      />
    </div>
  );
}
