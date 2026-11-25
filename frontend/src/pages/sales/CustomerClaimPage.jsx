import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Headphones, RefreshCw, Search } from "lucide-react";
import Pagination from "../../components/common/Pagination";
import { showGlobalToast } from "../../components/GlobalToast";
import ResolveClaimModal from "../../components/sales/modals/ResolveClaimModal";
import { notifyApiErrorToast } from "../../services/axiosClient";
import { salesApi } from "../../services/salesApi";

const CLAIM_STATUSES = [
  { value: "", label: "Tất cả khiếu nại" },
  { value: "Cho_xu_ly", label: "Chờ tiếp nhận" },
  { value: "Dang_xu_ly", label: "Đang xử lý" },
  { value: "Da_giai_quyet", label: "Đã giải quyết" },
  { value: "Tu_choi", label: "Từ chối" },
];

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

const dateTime = (value) => value
  ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const currency = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function ResolutionLabel({ claim }) {
  if (claim.resolution === "Hoan_tien") {
    return (
      <span className="font-semibold text-emerald-800">
        Hoàn tiền {claim.refund_amount ? currency.format(claim.refund_amount) : ""}
        {claim.refund_status === "Cho_xu_ly" ? " · Chờ thực hiện" : ""}
      </span>
    );
  }
  if (claim.resolution === "Giao_bu" && claim.replacement_order_id) {
    return <span className="font-semibold text-emerald-800">Đơn giao bù #{claim.replacement_order_id}</span>;
  }
  if (claim.resolution === "Tu_choi") {
    return <span className="font-semibold text-red-800">Từ chối</span>;
  }
  return <span className="text-slate-400">Chưa xử lý</span>;
}

export default function CustomerClaimPage() {
  const [claims, setClaims] = useState([]);
  const [counts, setCounts] = useState({});
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = JSON.stringify([search, status, page, refreshKey]);
  const loading = loadedKey !== requestKey;
  const [loadError, setLoadError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

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

    salesApi.getClaims({
      search: search || undefined,
      status: status || undefined,
      page,
      per_page: 10,
    })
      .then((response) => {
        if (!active) return;
        setClaims(response.data?.claims || []);
        setCounts(response.data?.counts || {});
        setMeta(response.meta || { current_page: 1, last_page: 1, per_page: 10, total: 0 });
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

  const openClaim = async (claimId) => {
    setSelectedClaim({ claim_id: claimId });
    setDetailLoading(true);
    try {
      const response = await salesApi.getClaim(claimId);
      setSelectedClaim(response.data);
    } catch (error) {
      setSelectedClaim(null);
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
      setSelectedClaim(response.data);
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

  const summaryCards = [
    { status: "Cho_xu_ly", label: "Chờ tiếp nhận", icon: Clock3, color: "text-amber-700", bg: "bg-amber-50" },
    { status: "Dang_xu_ly", label: "Đang xử lý", icon: Headphones, color: "text-sky-700", bg: "bg-sky-50" },
    { status: "Da_giai_quyet", label: "Đã giải quyết", icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50" },
    { status: "Tu_choi", label: "Từ chối", icon: AlertCircle, color: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">Bán hàng & chăm sóc khách hàng</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#00450d]">
            <Headphones className="h-6 w-6" aria-hidden="true" />
            Tiếp nhận & xử lý khiếu nại
          </h1>
          <p className="mt-1 text-sm text-[#5a6357]">Kiểm tra phản ánh, bằng chứng và theo dõi phương án hỗ trợ khách hàng.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2 text-sm font-bold text-[#00450d] hover:bg-[#f2f4f2] disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê khiếu nại">
        {summaryCards.map(({ status: cardStatus, label, icon: Icon, color, bg }) => (
          <button
            type="button"
            key={cardStatus}
            onClick={() => {
              setStatus(cardStatus);
              setPage(1);
            }}
            className={`flex items-center justify-between rounded-2xl border border-[#c0c9bb]/30 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${status === cardStatus ? "ring-2 ring-emerald-600" : ""}`}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-600">{label}</span>
              <span className="mt-1 block text-2xl font-black text-[#00450d]">{counts[cardStatus] || 0}</span>
            </span>
            <span className={`rounded-xl p-3 ${bg} ${color}`}><Icon className="h-5 w-5" /></span>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border border-[#c0c9bb]/35 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Tìm mã khiếu nại, mã đơn, tên hoặc số điện thoại khách"
              className="min-h-11 w-full rounded-xl border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Lọc trạng thái khiếu nại"
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 sm:w-56"
          >
            {CLAIM_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </section>

      {loadError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

      <section className="overflow-hidden rounded-2xl border border-[#c0c9bb]/35 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c0c9bb]/25 px-4 py-3 text-sm text-[#5a6357]">
          <span>{meta.total} hồ sơ khiếu nại</span>
          <span>{loading ? "Đang tải..." : `Trang ${meta.current_page} / ${meta.last_page}`}</span>
        </div>
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">Đang tải hồ sơ khiếu nại...</div>
        ) : claims.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">Không tìm thấy hồ sơ khiếu nại phù hợp.</div>
        ) : (
          <div className="divide-y divide-[#c0c9bb]/20">
            {claims.map((claim) => (
              <article key={claim.claim_id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-[#00450d]">Khiếu nại #{claim.claim_id}</h2>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[claim.status] || "border-slate-200 bg-slate-50 text-slate-700"}`}>
                      {STATUS_LABELS[claim.status] || claim.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{claim.customer?.name || "Khách hàng"} <span className="font-normal text-slate-500">{claim.customer?.phone}</span></p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{claim.reason}: {claim.description}</p>
                </div>
                <div className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-1">
                  <p>Đơn gốc <span className="font-bold text-slate-900">#{claim.order_id}</span> · {currency.format(claim.order?.total || 0)}</p>
                  <p>{claim.evidence?.length || 0} tệp bằng chứng · Gửi {dateTime(claim.submitted_at)}</p>
                  <ResolutionLabel claim={claim} />
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {claim.status === "Cho_xu_ly" && (
                    <button
                      type="button"
                      onClick={async () => {
                        const received = await receiveClaim(claim.claim_id);
                        if (received) await openClaim(claim.claim_id);
                      }}
                      disabled={busy}
                      className="min-h-10 rounded-xl border border-emerald-700 px-3 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Tiếp nhận
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openClaim(claim.claim_id)}
                    className="min-h-10 rounded-xl bg-[#075b25] px-3 py-2 text-sm font-bold text-white hover:bg-[#00450d]"
                  >
                    {claim.status === "Da_giai_quyet" || claim.status === "Tu_choi" ? "Xem hồ sơ" : "Xem & xử lý"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Pagination
        currentPage={meta.current_page}
        lastPage={meta.last_page}
        total={meta.total}
        perPage={meta.per_page}
        onPageChange={setPage}
        itemLabel="hồ sơ khiếu nại"
      />

      <ResolveClaimModal
        key={selectedClaim?.claim_id || "none"}
        claim={selectedClaim}
        loading={detailLoading}
        busy={busy}
        onClose={() => {
          if (!busy) setSelectedClaim(null);
        }}
        onReceive={receiveClaim}
        onResolve={resolveClaim}
      />
    </div>
  );
}
