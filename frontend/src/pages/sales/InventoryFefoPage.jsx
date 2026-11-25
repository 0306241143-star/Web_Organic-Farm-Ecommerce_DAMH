import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  PackageSearch,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Pagination from "../../components/common/Pagination";
import FefoBatchTable from "../../components/sales/FefoBatchTable";
import { salesApi } from "../../services/salesApi";
import { showGlobalToast } from "../../components/GlobalToast";

const PER_PAGE = 10;

const getSalesBatchPriority = (batch) => {
  if (batch.status === "Da_huy") return 4;
  if (batch.status === "Het_hang") return 3;
  if (batch.days_until_expiry < 0 && batch.remaining_quantity > 0) return 2; // Quá hạn
  if (batch.status === "Sap_het_han" || batch.is_expiring_soon) return 0; // Cận hạn
  return 1; // Con_hang
};

export default function InventoryFefoPage() {
  const [allBatches, setAllBatches] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchInventoryData = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError("");

    try {
      const firstRes = await salesApi.getInventory({
        status: "ALL",
        page: 1,
        per_page: 50,
      });
      let merged = firstRes.data || [];
      const lastPage = Number(firstRes.meta?.last_page || 1);

      if (lastPage > 1) {
        const restPages = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, idx) =>
            salesApi.getInventory({
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

      setAllBatches(merged);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật danh sách tồn kho FEFO mới nhất!");
      }
    } catch (requestError) {
      setError(requestError.message || "Không thể tải dữ liệu tồn kho FEFO.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData(false);
  }, [fetchInventoryData]);

  const counts = useMemo(() => {
    let active = 0;
    let expiring = 0;
    let depleted = 0;
    let cancelled = 0;

    allBatches.forEach((batch) => {
      if (batch.status === "Con_hang") active += 1;
      if (batch.status === "Sap_het_han" || batch.is_expiring_soon) expiring += 1;
      if (batch.status === "Het_hang") depleted += 1;
      if (batch.status === "Da_huy") cancelled += 1;
    });

    return {
      all: allBatches.length,
      active,
      expiring,
      depleted,
      cancelled,
    };
  }, [allBatches]);

  const filteredBatches = useMemo(() => {
    const kw = search.trim().toLowerCase();

    return allBatches
      .filter((batch) => {
        if (status === "Sap_het_han") {
          if (batch.status !== "Sap_het_han" && !batch.is_expiring_soon) {
            return false;
          }
        } else if (status !== "ALL" && batch.status !== status) {
          return false;
        }

        if (!kw) return true;

        const formattedCode = `#lh-${String(batch.batch_id).padStart(4, "0")}`;
        return (
          String(batch.batch_id).includes(kw) ||
          formattedCode.includes(kw) ||
          String(batch.product_name || "").toLowerCase().includes(kw) ||
          String(batch.plot_name || "").toLowerCase().includes(kw)
        );
      })
      .sort((a, b) => {
        // 1. Cận hạn (0) -> Còn hàng (1) -> Quá hạn (2) -> Hết hàng (3) -> Đã hủy (4)
        const groupDiff = getSalesBatchPriority(a) - getSalesBatchPriority(b);
        if (groupDiff !== 0) return groupDiff;

        // 2. Trong nhóm đang bán, ưu tiên HSD gần nhất (cận date) lên đầu
        const priority = getSalesBatchPriority(a);
        if (priority <= 1) {
          const daysA = Number(a.days_until_expiry ?? 9999);
          const daysB = Number(b.days_until_expiry ?? 9999);
          if (daysA !== daysB) return daysA - daysB;
        }

        // 3. Tiếp theo sắp xếp theo số lượng tồn kho (thấp đến cao)
        const qtyDiff =
          Number(a.remaining_quantity ?? 0) - Number(b.remaining_quantity ?? 0);
        if (qtyDiff !== 0) return qtyDiff;

        return Number(a.batch_id) - Number(b.batch_id);
      });
  }, [allBatches, status, search]);

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

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const filterTabs = [
    { id: "ALL", label: "Tất cả", count: counts.all },
    { id: "Con_hang", label: "Còn hàng", count: counts.active },
    { id: "Sap_het_han", label: "Cận hạn", count: counts.expiring },
    { id: "Het_hang", label: "Hết hàng", count: counts.depleted },
    { id: "Da_huy", label: "Đã hủy", count: counts.cancelled },
  ];

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] sm:h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-2.5 space-y-2 sm:space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút làm mới */}
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                <span className="shrink-0">Bán Hàng & CSKH</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="normal-case font-semibold text-emerald-800 truncate">
                  Hết hạn trước, xuất trước (FEFO)
                </span>
              </div>
              <h1 className="text-[15px] sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5 mt-0.5">
                <PackageSearch className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span>Quản Lý Tồn Kho FEFO</span>
              </h1>
            </div>

            <button
              type="button"
              onClick={() => fetchInventoryData(true)}
              disabled={refreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer shrink-0"
              title="Làm mới dữ liệu"
              aria-label="Làm mới dữ liệu"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
              />
            </button>
          </div>

          {/* Hàng 2: Thanh cảnh báo lô sắp hết hạn */}
          {counts.expiring > 0 && (
            <div
              aria-live="polite"
              className="flex items-start sm:items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-1.5 text-amber-950 text-[11.5px] sm:text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <p className="leading-snug line-clamp-2 sm:truncate">
                Có <strong>{counts.expiring}</strong> lô còn hàng sẽ hết hạn trong 2 ngày tới — ưu tiên xuất kho theo hạn gần nhất hoặc bấm <strong>Xả hàng</strong> ở từng lô bên dưới.
              </p>
            </div>
          )}

          {/* Hàng 3: Tabs lọc trạng thái & Ô tìm kiếm */}
          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5 md:pb-0">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => changeStatus(tab.id)}
                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${status === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full tabular-nums ${status === tab.id
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
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Tìm mã lô, tên nông sản..."
                className="w-full pl-8 pr-7 py-2 sm:py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => changeSearch("")}
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
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <FefoBatchTable batches={paginatedBatches} loading={loading} />

          <Pagination
            currentPage={paginationMeta.current_page}
            lastPage={paginationMeta.last_page}
            total={paginationMeta.total}
            perPage={paginationMeta.per_page}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="lô hàng"
          />
        </div>
      </div>
    </div>
  );
}