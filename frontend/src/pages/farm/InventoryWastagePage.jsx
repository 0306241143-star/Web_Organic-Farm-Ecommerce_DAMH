/* Inventory audit, FEFO expiry check, and wastage/disposal logging page. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  History,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast } from "../../components/GlobalToast";
import Pagination from "../../components/common/Pagination";
import InventoryAuditTab from "../../components/farm/wastage/InventoryAuditTab";
import WastageHistoryTab from "../../components/farm/wastage/WastageHistoryTab";
import RecordWastageModal from "../../components/farm/wastage/RecordWastageModal";

const PER_PAGE = 10;

export default function InventoryWastagePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // =========================================================================
  // 1. STATE QUẢN LÝ DỮ LIỆU TỒN KHO & LỊCH SỬ XUẤT HỦY (2 PAGE / TAB)
  // =========================================================================
  const [activeTab, setActiveTab] = useState("audit"); // "audit" | "history"
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [rawHistory, setRawHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // =========================================================================
  // 2. STATE BỘ LỌC TỨC THÌ (0MS) & PHÂN TRANG CHO TỪNG PAGE
  // =========================================================================
  // Page 1: Kiểm kho thực tế
  const [auditFilter, setAuditFilter] = useState("all"); // all | expired | expiring | normal
  const [auditSearch, setAuditSearch] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Page 2: Sổ lịch sử xuất hủy
  const [historyType, setHistoryType] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  // Modal ghi nhận hao hụt / xuất hủy
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // =========================================================================
  // 3. API HANDLERS & TẢI DỮ LIỆU
  // =========================================================================
  // Tải danh sách lô; dữ liệu im lặng vẫn hiển thị thông báo cập nhật ngắn.
  const loadBatches = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setBatchesLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getBatches();
      const payload = res.data?.data ?? res.data ?? {};
      setBatches(Array.isArray(payload) ? payload : payload.batches ?? []);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật dữ liệu kiểm kho mới nhất!");
      }
    } catch {
      showGlobalToast("Không thể tải danh sách lô hàng trong kho.", "error");
    } finally {
      setBatchesLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setHistoryLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getDisposals();
      const list = res.data?.data ?? res.data ?? [];
      setRawHistory(Array.isArray(list) ? list : []);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật sổ lịch sử xuất hủy!");
      }
    } catch {
      showGlobalToast("Không thể tải lịch sử xuất hủy kho.", "error");
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBatches(false);
    loadHistory(false);
  }, [loadBatches, loadHistory]);

  // =========================================================================
  // 4. TÍNH TOÁN DỮ LIỆU LỌC & PHÂN TRANG CHO PAGE 1 (KIỂM KHO)
  // =========================================================================
  const enrichedBatches = useMemo(() => {
    return batches
      .map((b) => {
        const remaining = Number(b.remaining_quantity ?? 0);
        const harvested = Number(b.harvest_quantity ?? 0);
        const wastage = Number(b.wastage_total ?? 0);
        const daysLeft = Number(b.days_until_expiry ?? 0);

        let health = "normal";
        if (daysLeft < 0) health = "expired";
        else if (daysLeft <= 2) health = "expiring";

        return { ...b, remaining, harvested, wastage, daysLeft, health };
      })
      .filter((b) => b.remaining > 0)
      .sort((a, b) => {
        // Ưu tiên quá hạn -> cận hạn -> còn hạn tốt, cùng nhóm xếp tồn thấp lên trước
        const rank = { expired: 0, expiring: 1, normal: 2 };
        if (rank[a.health] !== rank[b.health]) {
          return rank[a.health] - rank[b.health];
        }
        if (a.daysLeft !== b.daysLeft) {
          return a.daysLeft - b.daysLeft;
        }
        return a.remaining - b.remaining;
      });
  }, [batches]);

  // Tự động mở form Kiểm kho & Ghi nhận hao hụt nếu URL có query batch_id (từ trang Lô thu hoạch)
  useEffect(() => {
    const batchIdFromUrl = searchParams.get("batch_id");
    if (!batchIdFromUrl || batchesLoading) return;

    const matched = enrichedBatches.find(
      (b) => String(b.id) === String(batchIdFromUrl)
    );
    if (matched) {
      setActiveTab("audit");
      setSelectedBatch(matched);
    } else if (batches.length > 0) {
      showGlobalToast(
        "Lô hàng này đã xuất hết hoặc không còn tồn kho khả dụng.",
        "warning"
      );
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("batch_id");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, batchesLoading, enrichedBatches, batches.length]);

  const auditCounts = useMemo(() => {
    return {
      all: enrichedBatches.length,
      expired: enrichedBatches.filter((b) => b.health === "expired").length,
      expiring: enrichedBatches.filter((b) => b.health === "expiring").length,
      normal: enrichedBatches.filter((b) => b.health === "normal").length,
    };
  }, [enrichedBatches]);

  const filteredAuditBatches = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return enrichedBatches.filter((b) => {
      if (auditFilter !== "all" && b.health !== auditFilter) return false;
      if (!q) return true;
      return (
        String(b.batch_code || "").toLowerCase().includes(q) ||
        String(b.product_name || "").toLowerCase().includes(q) ||
        String(b.plot_name || "").toLowerCase().includes(q)
      );
    });
  }, [enrichedBatches, auditFilter, auditSearch]);

  const auditPagination = useMemo(() => {
    const total = filteredAuditBatches.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(auditPage, lastPage);
    return {
      current_page: safePage,
      last_page: lastPage,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredAuditBatches.length, auditPage]);

  const paginatedAuditBatches = useMemo(() => {
    const start = (auditPagination.current_page - 1) * PER_PAGE;
    return filteredAuditBatches.slice(start, start + PER_PAGE);
  }, [filteredAuditBatches, auditPagination.current_page]);

  // =========================================================================
  // 5. TÍNH TOÁN DỮ LIỆU LỌC & PHÂN TRANG CHO PAGE 2 (LỊCH SỬ XUẤT HỦY)
  // =========================================================================
  const historyCounts = useMemo(() => {
    return {
      all: rawHistory.length,
      Xuat_huy: rawHistory.filter((i) => i.type === "Xuat_huy").length,
      Hao_hut: rawHistory.filter((i) => i.type === "Hao_hut").length,
      Dieu_chinh: rawHistory.filter((i) => i.type === "Dieu_chinh").length,
    };
  }, [rawHistory]);

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return rawHistory.filter((item) => {
      if (historyType && item.type !== historyType) return false;
      if (!q) return true;
      return (
        String(item.batch_code || "").toLowerCase().includes(q) ||
        String(item.product_name || "").toLowerCase().includes(q) ||
        String(item.reason || "").toLowerCase().includes(q)
      );
    });
  }, [rawHistory, historyType, historySearch]);

  const historyPagination = useMemo(() => {
    const total = filteredHistory.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(historyPage, lastPage);
    return {
      current_page: safePage,
      last_page: lastPage,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredHistory.length, historyPage]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPagination.current_page - 1) * PER_PAGE;
    return filteredHistory.slice(start, start + PER_PAGE);
  }, [filteredHistory, historyPagination.current_page]);

  // =========================================================================
  // 6. SUBMIT PHIẾU GHI NHẬN HAO HỤT / XUẤT HỦY
  // =========================================================================
  const handleRecordWastage = async (payload) => {
    if (!selectedBatch || submitting) return;
    setSubmitting(true);
    try {
      await farmApi.recordBatchWastage(selectedBatch.id, payload);
      showGlobalToast(
        "Đã cập nhật tồn kho thực tế và lưu phiếu biến động.",
        "success"
      );
      setSelectedBatch(null);
      await Promise.all([loadBatches(false), loadHistory(false)]);
    } catch (err) {
      showGlobalToast(err?.message || "Ghi nhận hao hụt thất bại.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // 7. GIAO DIỆN ĐỒNG BỘ BỐ CỤC CHỨNG NHẬN (KHÔNG THANH CUỘN NGOÀI)
  // =========================================================================
  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mb-3.5 sm:-mb-6 lg:-mb-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* 7.1 KHỐI HEADER CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 pb-2.5 space-y-2.5">
          {/* Hàng 1: Tiêu đề + Chuyển 2 Page (Kiểm kho / Lịch sử) + Nút Làm mới */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                <span>Phân Hệ Nông Trại</span>
                <span className="text-slate-300">•</span>
                <span className="normal-case font-semibold text-emerald-800">
                  Quản lý tồn kho theo lô & Biến động kho
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 mt-0.5">
                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span>Kiểm Kho & Xuất Hủy</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Bộ chuyển đổi 2 Page */}
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setActiveTab("audit")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "audit"
                      ? "bg-white text-emerald-800 shadow-2xs ring-1 ring-emerald-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Kiểm Kho Thực Tế</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 tabular-nums">
                    {auditCounts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "history"
                      ? "bg-white text-emerald-800 shadow-2xs ring-1 ring-emerald-200/80"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Sổ Lịch Sử Xuất Hủy</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-slate-200/80 text-slate-700 tabular-nums">
                    {historyCounts.all}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  activeTab === "audit" ? loadBatches(true) : loadHistory(true)
                }
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Hàng 2: Thanh bộ lọc & Ô tìm kiếm tương ứng với từng Page đang mở */}
          {activeTab === "audit" ? (
            <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0">
                {[
                  { id: "all", label: "Tất cả", count: auditCounts.all },
                  { id: "expired", label: "Đã quá hạn", count: auditCounts.expired },
                  { id: "expiring", label: "Cận hạn ≤ 2 ngày", count: auditCounts.expiring },
                  { id: "normal", label: "Còn hạn tốt", count: auditCounts.normal },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setAuditFilter(tab.id);
                      setAuditPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      auditFilter === tab.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                        auditFilter === tab.id
                          ? "bg-white/25 text-white"
                          : "bg-white text-slate-600 border border-slate-200/80"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={auditSearch}
                  onChange={(e) => {
                    setAuditSearch(e.target.value);
                    setAuditPage(1);
                  }}
                  placeholder="Tìm mã lô QR, nông sản, lô canh tác..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                />
                {auditSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setAuditSearch("");
                      setAuditPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Xóa từ khóa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0">
                {[
                  { id: "", label: "Tất cả phiếu", count: historyCounts.all },
                  {
                    id: "Xuat_huy",
                    label: "Xuất hủy hư hỏng / quá hạn",
                    count: historyCounts.Xuat_huy,
                  },
                  {
                    id: "Hao_hut",
                    label: "Hao hụt tự nhiên",
                    count: historyCounts.Hao_hut,
                  },
                  {
                    id: "Dieu_chinh",
                    label: "Điều chỉnh kiểm kê",
                    count: historyCounts.Dieu_chinh,
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setHistoryType(item.id);
                      setHistoryPage(1);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      historyType === item.id
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                        historyType === item.id
                          ? "bg-white/25 text-white"
                          : "bg-white text-slate-600 border border-slate-200/80"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(1);
                  }}
                  placeholder="Lọc theo mã lô QR, nông sản, lý do..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearch("");
                      setHistoryPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Xóa từ khóa"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 7.2 VÙNG NỘI DUNG CUỘN ĐỘC LẬP BÊN DƯỚI */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 space-y-4">
          {activeTab === "audit" ? (
            <>
              <InventoryAuditTab
                batches={paginatedAuditBatches}
                totalFilteredCount={filteredAuditBatches.length}
                loading={batchesLoading}
                onOpenWastageModal={(batch) => setSelectedBatch(batch)}
              />

              <Pagination
                currentPage={auditPagination.current_page}
                lastPage={auditPagination.last_page}
                total={auditPagination.total}
                perPage={auditPagination.per_page}
                onPageChange={(nextPage) => setAuditPage(nextPage)}
                itemLabel="lô tồn kho"
              />
            </>
          ) : (
            <>
              <WastageHistoryTab
                history={paginatedHistory}
                totalFilteredCount={filteredHistory.length}
                loading={historyLoading}
              />

              <Pagination
                currentPage={historyPagination.current_page}
                lastPage={historyPagination.last_page}
                total={historyPagination.total}
                perPage={historyPagination.per_page}
                onPageChange={(nextPage) => setHistoryPage(nextPage)}
                itemLabel="phiếu biến động"
              />
            </>
          )}
        </div>
      </div>

      {/* 7.3 HỘP THOẠI: PHIẾU KIỂM KHO & GHI NHẬN HAO HỤT / XUẤT HỦY */}
      {selectedBatch && (
        <RecordWastageModal
          batch={selectedBatch}
          submitting={submitting}
          onClose={() => setSelectedBatch(null)}
          onSubmit={handleRecordWastage}
        />
      )}
    </div>
  );
}