import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Flame,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import FlashSaleCampaignCard from "../../components/sales/FlashSaleCampaignCard";
import FlashSaleFormModal from "../../components/sales/FlashSaleFormModal";
import Pagination from "../../components/common/Pagination";
import { salesApi } from "../../services/salesApi";
import { showGlobalToast } from "../../components/GlobalToast";

const PER_PAGE = 10;

export default function FlashSalePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const prefillBatchId = searchParams.get("batch_id") || "";
  const prefillBatchFromState = location.state?.prefillBatch || null;

  const [allCampaigns, setAllCampaigns] = useState([]);
  const [campaignStatus, setCampaignStatus] = useState("ALL");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignPage, setCampaignPage] = useState(1);

  const [campaignLoading, setCampaignLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batches, setBatches] = useState(() =>
    prefillBatchFromState && !prefillBatchFromState.has_active_flash_sale
      ? [prefillBatchFromState]
      : []
  );
  const [batchLoading, setBatchLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(() =>
    Boolean(prefillBatchId && !prefillBatchFromState?.has_active_flash_sale)
  );
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [busyCampaignId, setBusyCampaignId] = useState(null);
  const [error, setError] = useState("");

  const isPrefillBatchAlreadyActive = useMemo(() => {
    if (!prefillBatchId) return false;
    if (prefillBatchFromState?.has_active_flash_sale) return true;
    return allCampaigns.some(
      (c) =>
        c.status !== "Da_ket_thuc" &&
        (c.items || []).some(
          (item) => String(item.batch_id) === String(prefillBatchId)
        )
    );
  }, [prefillBatchId, prefillBatchFromState, allCampaigns]);

  useEffect(() => {
    if (!prefillBatchId) return;

    if (isPrefillBatchAlreadyActive) {
      showGlobalToast(
        "Lô hàng này đã thuộc một chương trình Flash Sale đang hoạt động."
      );
      setIsModalOpen(false);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("batch_id");
      setSearchParams(nextParams, { replace: true });
      return;
    }

    setIsModalOpen(true);
  }, [prefillBatchId, isPrefillBatchAlreadyActive, searchParams, setSearchParams]);

  const fetchCampaigns = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setCampaignLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const firstRes = await salesApi.getFlashSales({
        status: "ALL",
        page: 1,
        per_page: 50,
      });
      let merged = firstRes.data || [];
      const lastPage = Number(firstRes.meta?.last_page || 1);

      if (lastPage > 1) {
        const restPages = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, idx) =>
            salesApi.getFlashSales({
              status: "ALL",
              page: idx + 2,
              per_page: 50,
            })
          )
        );
        restPages.forEach((res) => {
          merged = merged.concat(res.data || []);
        });
      }

      setAllCampaigns(merged);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật danh sách chương trình Flash Sale!");
      }
    } catch (requestError) {
      setError(
        requestError.message || "Không thể tải danh sách chương trình Flash Sale."
      );
    } finally {
      setCampaignLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchExpiringBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const response = await salesApi.getExpiringBatches({ per_page: 50 });
      const fetched = response.data || [];
      if (
        prefillBatchFromState &&
        !prefillBatchFromState.has_active_flash_sale &&
        !fetched.some(
          (b) => String(b.batch_id) === String(prefillBatchFromState.batch_id)
        )
      ) {
        setBatches([prefillBatchFromState, ...fetched]);
      } else {
        setBatches(fetched);
      }
    } catch {
      // Giữ danh sách hiện có nếu lỗi mạng tạm thời
    } finally {
      setBatchLoading(false);
    }
  }, [prefillBatchFromState]);

  useEffect(() => {
    fetchCampaigns(false);
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchExpiringBatches();
  }, [fetchExpiringBatches]);

  const counts = useMemo(() => {
    let active = 0;
    let paused = 0;
    let ended = 0;

    allCampaigns.forEach((c) => {
      if (c.status === "Dang_dien_ra") active += 1;
      else if (c.status === "Sap_dien_ra") paused += 1;
      else if (c.status === "Da_ket_thuc") ended += 1;
    });

    return {
      all: allCampaigns.length,
      active,
      paused,
      ended,
    };
  }, [allCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const kw = campaignSearch.trim().toLowerCase();
    return allCampaigns.filter((campaign) => {
      if (campaignStatus !== "ALL" && campaign.status !== campaignStatus) {
        return false;
      }
      if (!kw) return true;

      const matchTitle =
        String(campaign.campaign_id).includes(kw) ||
        String(campaign.title || "").toLowerCase().includes(kw);
      const matchItem = (campaign.items || []).some(
        (item) =>
          String(item.batch_id).includes(kw) ||
          String(item.product_name || "").toLowerCase().includes(kw)
      );
      return matchTitle || matchItem;
    });
  }, [allCampaigns, campaignStatus, campaignSearch]);

  const paginationMeta = useMemo(() => {
    const total = filteredCampaigns.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(campaignPage, lastPage);
    return {
      current_page: safePage,
      last_page: lastPage,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredCampaigns.length, campaignPage]);

  const paginatedCampaigns = useMemo(() => {
    const start = (paginationMeta.current_page - 1) * PER_PAGE;
    return filteredCampaigns.slice(start, start + PER_PAGE);
  }, [filteredCampaigns, paginationMeta.current_page]);

  const initialBatch = useMemo(() => {
    if (!prefillBatchId || isPrefillBatchAlreadyActive) return null;
    if (
      prefillBatchFromState &&
      String(prefillBatchFromState.batch_id) === String(prefillBatchId)
    ) {
      return prefillBatchFromState;
    }
    return (
      batches.find(
        (b) =>
          !b.has_active_flash_sale &&
          String(b.batch_id) === String(prefillBatchId)
      ) || null
    );
  }, [
    prefillBatchId,
    isPrefillBatchAlreadyActive,
    prefillBatchFromState,
    batches,
  ]);

  const clearPrefillQuery = () => {
    if (!prefillBatchId) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("batch_id");
    setSearchParams(nextParams, { replace: true });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setModalError("");
    clearPrefillQuery();
  };

  const handleOpenCreateModal = () => {
    clearPrefillQuery();
    setModalError("");
    setIsModalOpen(true);
  };

  const createCampaign = async (data) => {
    setSaving(true);
    setModalError("");
    try {
      const response = await salesApi.createFlashSale(data);
      const created = response.data;
      if (created?.campaign_id) {
        setAllCampaigns((prev) => [
          created,
          ...prev.filter((c) => c.campaign_id !== created.campaign_id),
        ]);
      } else {
        fetchCampaigns(true);
      }
      showGlobalToast(response.message || "Đã tạo và bật chương trình Flash Sale!");
      setIsModalOpen(false);
      clearPrefillQuery();
      fetchExpiringBatches();
    } catch (requestError) {
      setModalError(
        requestError.message || "Không thể tạo chương trình Flash Sale."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleCampaign = async (campaign, enabled) => {
    setBusyCampaignId(campaign.campaign_id);
    setError("");
    try {
      const response = await salesApi.setFlashSaleEnabled(
        campaign.campaign_id,
        enabled
      );
      const nextStatus =
        response.data?.status || (enabled ? "Dang_dien_ra" : "Sap_dien_ra");
      setAllCampaigns((prev) =>
        prev.map((c) =>
          c.campaign_id === campaign.campaign_id
            ? { ...c, status: nextStatus }
            : c
        )
      );
      showGlobalToast(
        response.message ||
          (enabled
            ? "Đã bật chương trình Flash Sale."
            : "Đã tắt chương trình Flash Sale.")
      );
    } catch (requestError) {
      setError(
        requestError.message || "Không thể cập nhật trạng thái chương trình."
      );
    } finally {
      setBusyCampaignId(null);
    }
  };

  const filterTabs = [
    { id: "ALL", label: "Tất cả", count: counts.all },
    { id: "Dang_dien_ra", label: "Đang bật", count: counts.active },
    { id: "Sap_dien_ra", label: "Tạm tắt / Sắp diễn ra", count: counts.paused },
    { id: "Da_ket_thuc", label: "Đã kết thúc", count: counts.ended },
  ];

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] sm:h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-2.5 space-y-2 sm:space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút làm mới & Tạo Flash Sale */}
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                <span className="shrink-0">Bán Hàng & CSKH</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="normal-case font-semibold text-emerald-800 truncate">
                  Khuyến mãi xả lô hàng cận hạn
                </span>
              </div>
              <h1 className="text-[15px] sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5 mt-0.5">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0" />
                <span className="line-clamp-2 sm:line-clamp-none">
                  Quản Lý Flash Sale Cận Hạn
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pt-0.5 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  fetchCampaigns(true);
                  fetchExpiringBatches();
                }}
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
                onClick={handleOpenCreateModal}
                className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>
                  Tạo <span className="hidden min-[380px]:inline">Flash Sale</span>
                </span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Tabs lọc trạng thái & Ô tìm kiếm */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5 md:pb-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setCampaignStatus(tab.id);
                    setCampaignPage(1);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    campaignStatus === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                      campaignStatus === tab.id
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
                value={campaignSearch}
                onChange={(e) => {
                  setCampaignSearch(e.target.value);
                  setCampaignPage(1);
                }}
                placeholder="Tìm tên chiến dịch, mã lô, nông sản..."
                className="w-full pl-8 pr-7 py-2 sm:py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {campaignSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setCampaignSearch("");
                    setCampaignPage(1);
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

      {/* VÙNG DANH SÁCH CHƯƠNG TRÌNH FLASH SALE (CUỘN ĐỘC LẬP) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {campaignLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">
                Đang tải danh sách chương trình Flash Sale...
              </p>
            </div>
          ) : paginatedCampaigns.length > 0 ? (
            <div className="space-y-3 sm:space-y-3.5">
              {paginatedCampaigns.map((campaign) => (
                <FlashSaleCampaignCard
                  key={campaign.campaign_id}
                  campaign={campaign}
                  busy={busyCampaignId === campaign.campaign_id}
                  onToggle={toggleCampaign}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 px-5 py-10 sm:p-14 text-center space-y-2">
              <Flame className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Chưa có chương trình Flash Sale phù hợp
              </p>
              <p className="text-xs text-slate-500">
                Bấm nút <strong>Tạo Flash Sale</strong> ở góc trên bên phải hoặc chọn{" "}
                <strong>Xả hàng</strong> từ trang Quản lý tồn kho FEFO.
              </p>
            </div>
          )}

          <Pagination
            currentPage={paginationMeta.current_page}
            lastPage={paginationMeta.last_page}
            total={paginationMeta.total}
            perPage={paginationMeta.per_page}
            onPageChange={(nextPage) => setCampaignPage(nextPage)}
            itemLabel="chương trình"
          />
        </div>
      </div>

      {/* FORM NỔI (MODAL) TẠO FLASH SALE */}
      <FlashSaleFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        batches={batches}
        initialBatch={initialBatch}
        loadingBatches={batchLoading}
        saving={saving}
        error={modalError}
        onSubmit={createCampaign}
      />
    </div>
  );
}