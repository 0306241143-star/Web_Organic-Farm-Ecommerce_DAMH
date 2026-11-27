import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  Clock3,
  Headphones,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import Pagination from "../../components/common/Pagination";
import { showGlobalToast } from "../../components/GlobalToast";
import ResolveClaimModal from "../../components/sales/modals/ResolveClaimModal";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { salesApi } from "../../services/salesApi";

const STATUS_LABELS = {
  Cho_xu_ly: "Chờ tiếp nhận",
  Dang_xu_ly: "Đang xử lý",
  Da_giai_quyet: "Đã giải quyết",
  Tu_choi: "Từ chối",
};

const STATUS_STYLES = {
  Cho_xu_ly: "border-amber-200 bg-amber-50 text-amber-800",
  Dang_xu_ly: "border-sky-200 bg-sky-50 text-sky-800",
  Da_giai_quyet: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Tu_choi: "border-red-200 bg-red-50 text-red-800",
};

const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function ResolutionBadge({ claim }) {
  if (claim.resolution === "Hoan_tien") {
    return (
      <span className="text-[11px] font-semibold text-emerald-700">
        Hoàn tiền {claim.refund_amount ? currency.format(claim.refund_amount) : ""}
      </span>
    );
  }
  if (claim.resolution === "Giao_bu" && claim.replacement_order_id) {
    return (
      <span className="text-[11px] font-semibold text-emerald-700">
        Giao bù #{claim.replacement_order_id}
      </span>
    );
  }
  if (claim.resolution === "Tu_choi") {
    return <span className="text-[11px] font-semibold text-red-700">Từ chối</span>;
  }
  return <span className="text-[11px] text-slate-400">Chưa xử lý</span>;
}

export default function CustomerClaimPage() {
  const [claims, setClaims] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify([search, status, page, refreshKey]);
  const loading = loadedKey !== requestKey;
  const [loadError, setLoadError] = useState("");

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Debounce ô tìm kiếm để tránh gọi API ở từng ký tự người dùng nhập.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    setLoadError("");

    salesApi
      .getClaims({
        search: search || undefined,
        status: status || undefined,
        page,
        per_page: 10,
      })
      .then((response) => {
        if (!active) return;
        setClaims(response.data?.claims || []);
        setCounts(response.data?.counts || {});
        setMeta(
          response.meta || {
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0,
          }
        );
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error.message || "Không thể tải danh sách khiếu nại.");
        notifyApiErrorToast(error, "Không thể tải danh sách khiếu nại.");
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });

    return () => {
      active = false;
    };
  }, [search, status, page, refreshKey, requestKey]);

  const totalAllClaims = useMemo(
    () =>
      (counts.Cho_xu_ly || 0) +
      (counts.Dang_xu_ly || 0) +
      (counts.Da_giai_quyet || 0) +
      (counts.Tu_choi || 0),
    [counts]
  );

  const filterTabs = [
    { id: "", label: "Tất cả", count: totalAllClaims },
    { id: "Cho_xu_ly", label: "Chờ tiếp nhận", count: counts.Cho_xu_ly || 0 },
    { id: "Dang_xu_ly", label: "Đang xử lý", count: counts.Dang_xu_ly || 0 },
    { id: "Da_giai_quyet", label: "Đã giải quyết", count: counts.Da_giai_quyet || 0 },
    { id: "Tu_choi", label: "Từ chối", count: counts.Tu_choi || 0 },
  ];

  const openClaim = async (claimOrId) => {
    const claimId = typeof claimOrId === "object" ? claimOrId.claim_id : claimOrId;
    if (!claimId) {
      setSelectedClaim(null);
      return;
    }

    if (typeof claimOrId === "object") {
      setSelectedClaim(claimOrId);
    } else {
      setSelectedClaim({ claim_id: claimId });
    }

    setDetailLoading(true);
    try {
      const response = await salesApi.getClaim(claimId);
      setSelectedClaim(response.data);
    } catch (error) {
      notifyApiErrorToast(error, "Không thể tải chi tiết hồ sơ khiếu nại.");
    } finally {
      setDetailLoading(false);
    }
  };

  const receiveClaim = async (claimId) => {
    setBusy(true);
    try {
      const response = await salesApi.receiveClaim(claimId);
      showGlobalToast("Đã tiếp nhận hồ sơ khiếu nại.");
      setSelectedClaim((prev) =>
        prev?.claim_id === claimId ? { ...prev, ...response.data } : response.data
      );
      setRefreshKey((value) => value + 1);
      const detail = await salesApi.getClaim(claimId);
      setSelectedClaim(detail.data);
      return true;
    } catch (error) {
      notifyApiErrorToast(error, "Không thể tiếp nhận hồ sơ khiếu nại.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resolveClaim = async (claimId, payload) => {
    setBusy(true);
    try {
      const response = await salesApi.resolveClaim(claimId, payload);
      const result = response.data;
      showGlobalToast(
        result.resolution === "Giao_bu" && result.replacement_order_id
          ? `Đã tạo đơn giao bù #${result.replacement_order_id}.`
          : result.resolution === "Hoan_tien"
            ? "Đã duyệt khiếu nại; khoản hoàn tiền đang chờ thực hiện."
            : "Đã lưu kết quả xử lý khiếu nại."
      );
      setSelectedClaim(result);
      setRefreshKey((value) => value + 1);
      return true;
    } catch (error) {
      notifyApiErrorToast(error, "Không thể lưu kết quả xử lý khiếu nại.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mb-3.5 sm:-mb-6 lg:-mb-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* 1. KHỐI HEADER CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 min-w-0">
              <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
              <span className="truncate">Tiếp Nhận &amp; Xử Lý Khiếu Nại</span>
            </h1>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] font-bold text-amber-800">
                <Clock3 className="w-3.5 h-3.5" />
                Chờ tiếp nhận: {counts.Cho_xu_ly || 0}
              </span>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200/80 text-[11px] font-bold text-sky-800">
                Đang xử lý: {counts.Dang_xu_ly || 0}
              </span>

              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer disabled:opacity-50"
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. KHỐI NỘI DUNG 2 CỘT CAO BẰNG NHAU SÁT MÉP DƯỚI */}
      <div className="flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-2.5 pb-2.5 sm:pt-3 sm:pb-3 grid grid-cols-1 lg:grid-cols-12 items-stretch gap-3.5 overflow-hidden">
        {/* CỘT TRÁI: BỘ LỌC + BẢNG KHIẾU NẠI CUỘN ĐỘC LẬP */}
        <div className="lg:col-span-7 min-w-0 flex flex-col h-full min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Thanh tìm kiếm & Tabs lọc trạng thái đứng yên ở đỉnh cột trái */}
          <div className="p-2.5 sm:p-3 border-b border-slate-100 bg-slate-50/70 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm mã khiếu nại, mã đơn, tên hoặc SĐT khách..."
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label="Xóa từ khóa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id || "ALL"}
                  type="button"
                  onClick={() => {
                    setStatus(tab.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    status === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                      status === tab.id
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Vùng danh sách hồ sơ & phân trang cuộn độc lập */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-3.5 space-y-3 scrollbar-thin">
            {loadError && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
              >
                {loadError}
              </p>
            )}

            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
              {!loading && claims.length > 0 && !selectedClaim && (
                <div className="px-3.5 sm:px-4 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
                  <span className="truncate">
                    Bấm chọn vào bất kỳ hồ sơ nào bên dưới để xem bằng chứng &amp; xử lý.
                  </span>
                  <span className="text-emerald-700 font-bold tabular-nums shrink-0">
                    {meta.total} hồ sơ
                  </span>
                </div>
              )}

              {loading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
                  <p className="text-xs text-slate-500 font-medium">
                    Đang tải hồ sơ khiếu nại...
                  </p>
                </div>
              ) : claims.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Headphones className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-700">
                    Không tìm thấy hồ sơ khiếu nại
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Thử thay đổi bộ lọc trạng thái hoặc từ khóa tìm kiếm khác.
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop & Tablet Table View */}
                  <div className="hidden md:block">
                    <table className="w-full table-fixed text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/80 text-[10.5px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90">
                          <th className="py-2.5 px-3.5 w-[34%]">Khiếu Nại &amp; Khách</th>
                          <th className="py-2.5 px-2.5 w-[28%]">Lý Do &amp; Đơn Gốc</th>
                          <th className="py-2.5 px-2.5 w-[18%]">Phương Án</th>
                          <th className="py-2.5 px-3.5 w-[20%] text-right">Trạng Thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {claims.map((claim) => {
                          const isSelected = selectedClaim?.claim_id === claim.claim_id;
                          return (
                            <tr
                              key={claim.claim_id}
                              role="button"
                              tabIndex={0}
                              aria-selected={isSelected}
                              onClick={() => openClaim(claim)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openClaim(claim);
                                }
                              }}
                              className={`transition-colors cursor-pointer group focus:outline-none focus-visible:bg-emerald-50/90 ${
                                isSelected
                                  ? "bg-emerald-50/90 ring-1 ring-inset ring-emerald-200"
                                  : "hover:bg-slate-50/90"
                              }`}
                            >
                              <td className="py-2.5 px-3.5 align-top">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#00450d]">
                                    #{claim.claim_id}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    · {claim.evidence?.length || 0} tệp
                                  </span>
                                </div>
                                <p className="mt-0.5 font-semibold text-slate-800 truncate">
                                  {claim.customer?.name || "Khách hàng"}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {claim.customer?.phone || dateTime(claim.submitted_at)}
                                </p>
                              </td>

                              <td className="py-2.5 px-2.5 align-top">
                                <p className="font-semibold text-slate-800 line-clamp-1">
                                  {claim.reason}
                                </p>
                                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                                  Đơn #{claim.order_id} ·{" "}
                                  {currency.format(claim.order?.total || 0)}
                                </p>
                                <p className="text-[10.5px] text-slate-400">
                                  {dateTime(claim.submitted_at)}
                                </p>
                              </td>

                              <td className="py-2.5 px-2.5 align-top">
                                <ResolutionBadge claim={claim} />
                              </td>

                              <td className="py-2.5 px-3.5 align-top text-right">
                                <div className="inline-flex flex-col items-end gap-1.5">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${
                                      STATUS_STYLES[claim.status] ||
                                      "border-slate-200 bg-slate-50 text-slate-700"
                                    }`}
                                  >
                                    {STATUS_LABELS[claim.status] || claim.status}
                                  </span>
                                  {claim.status === "Cho_xu_ly" ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const ok = await receiveClaim(claim.claim_id);
                                        if (ok) await openClaim(claim.claim_id);
                                      }}
                                      className="rounded-lg border border-emerald-600 bg-white px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                                    >
                                      Tiếp nhận
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 group-hover:text-emerald-700">
                                      Chi tiết
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact List View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {claims.map((claim) => {
                      const isSelected = selectedClaim?.claim_id === claim.claim_id;
                      return (
                        <div
                          key={claim.claim_id}
                          role="button"
                          tabIndex={0}
                          onClick={() => openClaim(claim)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openClaim(claim);
                            }
                          }}
                          className={`p-3 space-y-1.5 cursor-pointer transition-colors ${
                            isSelected ? "bg-emerald-50/80" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-[#00450d]">
                              Khiếu nại #{claim.claim_id} · Đơn #{claim.order_id}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                STATUS_STYLES[claim.status] ||
                                "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {STATUS_LABELS[claim.status] || claim.status}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">
                            {claim.customer?.name || "Khách hàng"}{" "}
                            <span className="font-normal text-slate-500">
                              {claim.customer?.phone}
                            </span>
                          </p>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            {claim.reason}: {claim.description}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <ResolutionBadge claim={claim} />
                            <span className="text-[11px] font-bold text-emerald-700 inline-flex items-center gap-0.5">
                              Xem &amp; xử lý <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              perPage={meta.per_page}
              onPageChange={setPage}
              itemLabel="hồ sơ khiếu nại"
            />
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT HỒ SƠ & XỬ LÝ KHIẾU NẠI (TÁI SỬ DỤNG ResolveClaimModal) */}
        <ResolveClaimModal
          key={selectedClaim?.claim_id || "none"}
          claim={selectedClaim}
          loading={detailLoading}
          busy={busy}
          totalClaims={totalAllClaims}
          onClose={() => {
            if (!busy) setSelectedClaim(null);
          }}
          onReceive={receiveClaim}
          onResolve={resolveClaim}
        />
      </div>
    </div>
  );
}