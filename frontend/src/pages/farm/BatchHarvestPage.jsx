/* Harvest batch management and QR-label traceability page. */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PackageCheck, Plus, RefreshCw, Search, X } from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast } from "../../components/GlobalToast";
import { notifyApiErrorToast } from "../../services/axiosClient";
import Pagination from "../../components/common/Pagination";
import CreateBatchModal from "../../components/farm/modals/CreateBatchModal";
import QrPrintPreviewModal from "../../components/farm/modals/QrPrintPreviewModal";
import BatchTable from "../../components/farm/batches/BatchTable";
import BatchDetailPanel from "../../components/farm/batches/BatchDetailPanel";

const PER_PAGE = 10;

const getFarmBatchPriority = (batch) => {
  if (batch.status === "Da_huy") return 4;
  if (batch.status === "Het_hang") return 3;
  if (
    batch.status === "Qua_han" ||
    (batch.days_until_expiry < 0 && batch.remaining_quantity > 0)
  ) {
    return 2;
  }
  if (batch.status === "Sap_het_han" || batch.is_expiring_soon) return 0;
  return 1; // Con_hang
};

export default function BatchHarvestPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 1. State dữ liệu lô thu hoạch
  const [batches, setBatches] = useState([]);
  const [eligiblePlots, setEligiblePlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 2. State lọc & phân trang (tức thì 0ms)
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // 3. State hộp thoại (Modals) & Master-Detail
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createInitialPlot, setCreateInitialPlot] = useState(null);
  const [createInitialDate, setCreateInitialDate] = useState(null);
  const [activeQrBatch, setActiveQrBatch] = useState(null);

  const [selectedBatch, setSelectedBatch] = useState(null);
  const [detailBatch, setDetailBatch] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailSubTab, setDetailSubTab] = useState("certificates");

  // Tải danh sách lô hàng thu hoạch
  const fetchBatches = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getBatches();
      const payload = res.data?.data ?? res.data ?? res ?? {};
      setBatches(payload.batches || []);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật danh sách lô thu hoạch mới nhất!");
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
    if (!plotIdFromUrl) return;

    const matched = eligiblePlots.find(
      (p) => String(p.id) === String(plotIdFromUrl)
    );
    setCreateInitialPlot(matched || { id: Number(plotIdFromUrl) });
    setCreateInitialDate(dateFromUrl || null);
    setIsCreateOpen(true);
  }, [searchParams, eligiblePlots]);

  // Đếm số lượng từng trạng thái hiển thị trực tiếp trên các tab lọc
  const tabCounts = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let expired = 0;
    let depleted = 0;
    let cancelled = 0;

    batches.forEach((b) => {
      if (b.status === "Con_hang") active += 1;
      else if (b.status === "Sap_het_han") expiring += 1;
      else if (b.status === "Qua_han") expired += 1;
      else if (b.status === "Het_hang") depleted += 1;
      else if (b.status === "Da_huy") cancelled += 1;
    });

    return {
      all: batches.length,
      active,
      expiring,
      expired,
      depleted,
      cancelled,
    };
  }, [batches]);

  // Lọc và sắp xếp theo thứ tự: Cận date -> Số lượng (thấp đến cao) -> Hủy
  const filteredBatches = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    return batches
      .filter((b) => {
        const matchSearch =
          !kw ||
          String(b.id).includes(kw) ||
          b.batch_code?.toLowerCase().includes(kw) ||
          b.product_name?.toLowerCase().includes(kw) ||
          b.plot_name?.toLowerCase().includes(kw);

        const matchStatus = statusFilter === "ALL" || b.status === statusFilter;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        const groupDiff = getFarmBatchPriority(a) - getFarmBatchPriority(b);
        if (groupDiff !== 0) return groupDiff;

        const priority = getFarmBatchPriority(a);
        if (priority <= 1) {
          const daysA = Number(a.days_until_expiry ?? 9999);
          const daysB = Number(b.days_until_expiry ?? 9999);
          if (daysA !== daysB) return daysA - daysB;
        }

        const qtyDiff =
          Number(a.remaining_quantity ?? 0) - Number(b.remaining_quantity ?? 0);
        if (qtyDiff !== 0) return qtyDiff;

        return Number(a.id) - Number(b.id);
      });
  }, [batches, searchTerm, statusFilter]);

  // Tính phân trang 10 lô / trang
  const paginationMeta = useMemo(() => {
    const total = filteredBatches.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(page, lastPage);
    return {
      current_page: safePage,
      last_page: lastPage,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredBatches.length, page]);

  const paginatedBatches = useMemo(() => {
    const start = (paginationMeta.current_page - 1) * PER_PAGE;
    return filteredBatches.slice(start, start + PER_PAGE);
  }, [filteredBatches, paginationMeta.current_page]);

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

  // Điều hướng sang trang Kiểm kho & Xuất hủy kèm ID lô hàng
  const handleNavigateToWastage = (batch) => {
    if (!batch?.id) return;
    navigate(`/farm/disposals?batch_id=${batch.id}`);
  };

  const filterTabs = [
    { id: "ALL", label: "Tất cả", count: tabCounts.all },
    { id: "Con_hang", label: "Còn hàng", count: tabCounts.active },
    { id: "Sap_het_han", label: "Cận hạn", count: tabCounts.expiring },
    { id: "Qua_han", label: "Quá hạn", count: tabCounts.expired },
    { id: "Het_hang", label: "Hết hàng", count: tabCounts.depleted },
    { id: "Da_huy", label: "Đã hủy", count: tabCounts.cancelled },
  ];

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mb-3.5 sm:-mb-6 lg:-mb-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-2.5 space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút làm mới & Tạo Lô Hàng */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                <span>Phân Hệ Nông Trại</span>
                <span className="text-slate-300">•</span>
                <span className="normal-case font-semibold text-emerald-800">
                  Lô thu hoạch & Mã QR truy xuất
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                <PackageCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span>Quản Lý Lô Hàng Thu Hoạch</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchBatches(true)}
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
                  setCreateInitialPlot(null);
                  setCreateInitialDate(null);
                  setIsCreateOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Lô Hàng</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Tabs lọc trạng thái & Ô tìm kiếm */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                      statusFilter === tab.id
                        ? "bg-white/25 text-white"
                        : "bg-white text-slate-600 border border-slate-200/80"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm mã lô, nông sản, lô đất..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Xóa từ khóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VÙNG NỘI DUNG CUỘN ĐỘC LẬP BÊN DƯỚI */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 space-y-4">
          <div
            className={
              selectedBatch
                ? "grid grid-cols-1 xl:grid-cols-12 gap-5 items-start"
                : "block"
            }
          >
            <div className={selectedBatch ? "xl:col-span-7 space-y-4" : "space-y-4"}>
              <BatchTable
                selectedBatch={selectedBatch}
                filteredBatches={paginatedBatches}
                totalFilteredCount={filteredBatches.length}
                loading={loading}
                handleSelectBatch={handleSelectBatch}
              />

              <Pagination
                currentPage={paginationMeta.current_page}
                lastPage={paginationMeta.last_page}
                total={paginationMeta.total}
                perPage={paginationMeta.per_page}
                onPageChange={(nextPage) => setPage(nextPage)}
                itemLabel="lô hàng"
              />
            </div>

            <BatchDetailPanel
              selectedBatch={selectedBatch}
              detailBatch={detailBatch}
              loadingDetail={loadingDetail}
              detailSubTab={detailSubTab}
              setDetailSubTab={setDetailSubTab}
              handleSelectBatch={handleSelectBatch}
              setActiveQrBatch={setActiveQrBatch}
              handleOpenWastage={handleNavigateToWastage}
            />
          </div>
        </div>
      </div>

      {/* Hộp thoại: Tạo Lô Thu Hoạch Mới */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setSearchParams({});
        }}
        onSuccess={(newBatch) => {
          showGlobalToast(
            `Đã tạo lô hàng thu hoạch #${newBatch?.batch_code || newBatch?.id} thành công!`
          );
          if (newBatch?.id) {
            setBatches((prev) => [
              newBatch,
              ...prev.filter((batch) => String(batch.id) !== String(newBatch.id)),
            ]);
            setPage(1);
            handleSelectBatch(newBatch, true);
          }
          fetchEligiblePlots();
        }}
        initialPlot={createInitialPlot}
        initialHarvestDate={createInitialDate}
        plots={eligiblePlots}
      />

      {/* Hộp thoại: Xem Trước & Xuất In Tem Mã QR */}
      <QrPrintPreviewModal
        batch={activeQrBatch}
        isOpen={!!activeQrBatch}
        onClose={() => setActiveQrBatch(null)}
      />
    </div>
  );
}