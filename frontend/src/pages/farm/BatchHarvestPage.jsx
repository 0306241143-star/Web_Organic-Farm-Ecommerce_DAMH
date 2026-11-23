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
import QrPrintPreviewModal from "../../components/farm/modals/QrPrintPreviewModal";
import BatchStatCards from "../../components/farm/batches/BatchStatCards";
import BatchTable from "../../components/farm/batches/BatchTable";
import BatchDetailPanel from "../../components/farm/batches/BatchDetailPanel";
import BatchWastageModal from "../../components/farm/batches/BatchWastageModal";

export default function BatchHarvestPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // =========================================================================
  // 1. STATE QUẢN LÝ DỮ LIỆU & CHỈ SỐ THỐNG KÊ LÔ HÀNG
  // =========================================================================
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

  // =========================================================================
  // 2. STATE BỘ LỌC TÌM KIẾM & TRẠNG THÁI
  // =========================================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // =========================================================================
  // 3. STATE HỘP THOẠI (MODALS)
  // =========================================================================
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialPlot, setCreateInitialPlot] = useState(null);
  const [createInitialDate, setCreateInitialDate] = useState(null);

  // QR Modal
  const [activeQrBatch, setActiveQrBatch] = useState(null);

  // Chi tiết lô hàng được chọn (Master-Detail)
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailBatch, setDetailBatch] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState("certificates"); // "certificates" | "timeline" | "disposals"

  // Modal ghi nhận hao hụt / xuất hủy
  const [wastageBatch, setWastageBatch] = useState(null);
  const [wastageForm, setWastageForm] = useState({
    quantity: "",
    type: "Hao_hut",
    reason: "",
  });
  const [wastageSubmitting, setWastageSubmitting] = useState(false);
  const [wastageError, setWastageError] = useState("");

  // =========================================================================
  // 4. API HANDLERS & TẢI DỮ LIỆU
  // =========================================================================
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

  // Tự động mở modal tạo lô nếu URL có query plot_id
  useEffect(() => {
    const plotIdFromUrl = searchParams.get("plot_id");
    const dateFromUrl = searchParams.get("date");
    if (plotIdFromUrl && eligiblePlots.length > 0) {
      const matched = eligiblePlots.find((p) => String(p.id) === String(plotIdFromUrl));
      if (matched) {
        setCreateInitialPlot(matched);
        setCreateInitialDate(dateFromUrl || null);
        setIsCreateOpen(true);
      }
    }
  }, [searchParams, eligiblePlots]);

  // =========================================================================
  // 5. EVENT HANDLERS (CHỌN LÔ, CHI TIẾT, HAO HỤT)
  // =========================================================================
  // Chọn xem chi tiết một lô hàng
  const handleSelectBatch = async (batch, isSilent = false) => {
    if (!batch) {
      setSelectedBatch(null);
      setDetailBatch(null);
      return;
    }

    setSelectedBatch(batch);
    if (!isSilent) setLoadingDetail(true);

    try {
      const res = await farmApi.getBatchDetail(batch.id);
      const payload = res.data?.data ?? res.data ?? res ?? {};
      setDetailBatch(payload.batch || payload);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải thông tin chi tiết lô hàng.");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Lọc danh sách lô theo từ khóa và trạng thái
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchSearch =
        !searchTerm.trim() ||
        b.batch_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.plot_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "ALL" || b.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  // Mở modal ghi nhận hao hụt
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
          const prevAvailableQty = Number(affectedBatch.remaining_quantity || 0);
          const nextAvailableQty = Number(updatedBatch.remaining_quantity || 0);

          return {
            ...prev,
            active_batches:
              (Number(prev.active_batches) || 0) +
              (updatedBatch.status === "Con_hang" ? 1 : 0) -
              (affectedBatch.status === "Con_hang" ? 1 : 0),
            expiring_soon_batches:
              (Number(prev.expiring_soon_batches) || 0) +
              (updatedBatch.status === "Sap_het_han" ? 1 : 0) -
              (affectedBatch.status === "Sap_het_han" ? 1 : 0),
            depleted_batches:
              (Number(prev.depleted_batches) || 0) +
              (updatedBatch.status === "Het_hang" ? 1 : 0) -
              (affectedBatch.status === "Het_hang" ? 1 : 0),
            total_available_qty: Math.max(
              0,
              (Number(prev.total_available_qty) || 0) -
                (wasAvailable ? prevAvailableQty : 0) +
                (isAvailable ? nextAvailableQty : 0)
            ),
          };
        });
      }

      showToast(`Đã xuất hủy / ghi nhận hao hụt ${qty} ${affectedBatch.product_unit} thành công!`);
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

  // =========================================================================
  // 6. GIAO DIỆN (UI RENDER)
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* 6.1 Top Banner Tiêu Chuẩn Phân Hệ Nông Trại */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-emerald-900/10 bg-gradient-to-br from-white via-[#fcfdfa] to-emerald-50/30 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-300/60">
                Phân Hệ Nông Trại
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-emerald-800">
                Lô thu hoạch & Mã QR truy xuất
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-700" />
              <span>Quản Lý Lô Hàng Thu Hoạch</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchBatches(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer shadow-2xs"
              title="Làm mới dữ liệu"
              aria-label="Làm mới dữ liệu"
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
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Lô Hàng</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6.2 Thẻ thống kê chỉ số KPI lô hàng */}
      <BatchStatCards stats={stats} />

      {/* 6.3 Danh sách Lô hàng Thu hoạch & Bảng điều khiển chi tiết (Master-Detail) */}
      <div
        className={
          selectedBatch
            ? "grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
            : "block"
        }
      >
        {/* Bảng dữ liệu lô hàng */}
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

        {/* Panel chi tiết lô hàng (Master-Detail) */}
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

      {/* 6.4 Hộp thoại: Tạo Lô Thu Hoạch Mới */}
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

      {/* 6.5 Hộp thoại: Xem Trước & Xuất In Tem Mã QR */}
      <QrPrintPreviewModal
        batch={activeQrBatch}
        isOpen={!!activeQrBatch}
        onClose={() => setActiveQrBatch(null)}
      />

      {/* 6.6 Hộp thoại: Ghi Nhận Hao Hụt / Xuất Hủy */}
      <BatchWastageModal
        batch={wastageBatch}
        isOpen={!!wastageBatch}
        onClose={() => setWastageBatch(null)}
        wastageForm={wastageForm}
        setWastageForm={setWastageForm}
        wastageError={wastageError}
        setWastageError={setWastageError}
        wastageSubmitting={wastageSubmitting}
        onSubmit={handleSubmitWastage}
      />
    </div>
  );
}
