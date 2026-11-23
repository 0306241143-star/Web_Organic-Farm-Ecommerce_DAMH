import { useEffect, useState } from "react";
import { AlertTriangle, PackageSearch } from "lucide-react";
import Pagination from "../../components/common/Pagination";
import FefoBatchTable from "../../components/sales/FefoBatchTable";
import { salesApi } from "../../services/salesApi";

const emptyMeta = { current_page: 1, last_page: 1, per_page: 20, total: 0 };

export default function InventoryFefoPage() {
  const [batches, setBatches] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(emptyMeta);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      salesApi.getInventory({ status, search: search || undefined, page, per_page: 20 }),
      salesApi.getExpiringBatches({ per_page: 1 }),
    ])
      .then(([inventory, expiring]) => {
        if (!active) return;
        setBatches(inventory.data || []);
        setMeta(inventory.meta || emptyMeta);
        setExpiringCount(expiring.meta?.total || 0);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Không thể tải dữ liệu tồn kho.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [status, search, page]);

  const changeStatus = (value) => {
    setLoading(true);
    setError("");
    setStatus(value);
    setPage(1);
  };

  const changeSearch = (value) => {
    setLoading(true);
    setError("");
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#006e1c]">
          Bán hàng & chăm sóc khách hàng
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-[#00450d]">
          <PackageSearch className="h-6 w-6" />
          Tồn kho FEFO
        </h1>
        <p className="mt-1 text-sm text-[#5a6357]">
          Theo dõi lô hàng theo hạn sử dụng gần nhất trước khi xuất bán.
        </p>
      </header>

      <section
        aria-live="polite"
        className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-sm">
          Có <strong>{expiringCount}</strong> lô còn hàng sẽ hết hạn trong 2 ngày tới.
          Khi xuất kho, hệ thống ưu tiên lô có hạn sử dụng gần nhất.
        </p>
      </section>

      <section className="grid gap-3 rounded-2xl border border-[#c0c9bb]/40 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
          Tìm theo mã lô hoặc tên nông sản
          <input
            type="search"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder="Nhập mã lô hoặc tên sản phẩm"
            className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
          Trạng thái lô
          <select
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            className="rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2.5 text-sm text-[#191c1b] outline-none focus:border-[#006e1c]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="Con_hang">Còn hàng</option>
            <option value="Sap_het_han">Sắp hết hạn</option>
            <option value="Het_hang">Hết hàng</option>
            <option value="Da_huy">Đã hủy</option>
          </select>
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {loading ? (
        <div className="rounded-2xl border border-[#c0c9bb]/40 bg-white py-12 text-center text-sm text-[#5a6357]">
          Đang tải tồn kho...
        </div>
      ) : (
        <>
          <p className="text-sm text-[#5a6357]">{meta.total} lô hàng</p>
          <FefoBatchTable batches={batches} />
          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            perPage={meta.per_page}
            onPageChange={(nextPage) => {
              setLoading(true);
              setPage(nextPage);
            }}
            itemLabel="lô hàng"
          />
        </>
      )}
    </div>
  );
}
