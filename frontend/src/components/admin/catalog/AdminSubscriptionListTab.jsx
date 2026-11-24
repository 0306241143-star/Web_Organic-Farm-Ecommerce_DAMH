/* Tab danh sách gói rau định kỳ trong trang Quản lý Danh mục & Sản phẩm của Admin. */
import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CheckCircle2,
  EyeOff,
  Loader2,
  Pencil,
  Scale,
  Search,
  Sprout,
  Trash2,
  X,
} from "lucide-react";
import { formatCurrencyVnd } from "../../../services/publicApi";

export default function AdminSubscriptionListTab({
  packages = [],
  loading = false,
  togglingSubId = null,
  onEditPackage,
  onToggleStatus,
  onDeletePackage,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (statusFilter !== "ALL" && pkg.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        const matchName = (pkg.name || "").toLowerCase().includes(kw);
        const matchDesc = (pkg.description || "").toLowerCase().includes(kw);
        const matchItems = (pkg.items || []).some((item) =>
          (item.product_name || "").toLowerCase().includes(kw)
        );
        if (!matchName && !matchDesc && !matchItems) return false;
      }
      return true;
    });
  }, [packages, statusFilter, search]);

  return (
    <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
      {/* Toolbar lọc & tìm kiếm */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "ALL", label: "Tất cả", count: packages.length },
            {
              id: "Dang_mo",
              label: "Đang mở bán",
              count: packages.filter((p) => p.status === "Dang_mo").length,
            },
            {
              id: "Tam_dung",
              label: "Tạm dừng",
              count: packages.filter((p) => p.status === "Tam_dung").length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-[#064e2e] text-white shadow-2xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên gói hoặc nông sản trong gói..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm text-slate-800 outline-none focus:border-emerald-600"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Nội dung danh sách */}
      {loading ? (
        <div className="p-10 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Đang tải danh sách gói rau định kỳ...</span>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="p-12 text-center space-y-2">
          <CalendarCheck2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">
            Chưa có gói rau định kỳ nào phù hợp
          </p>
          <p className="text-xs text-slate-500">
            Bấm &ldquo;Thêm Gói Định Kỳ Mới&rdquo; ở góc trên để tạo gói combo rau củ hằng tuần cho khách hàng.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 sm:p-6">
          {filteredPackages.map((pkg) => {
            const isActive = pkg.status === "Dang_mo";
            const isToggling = togglingSubId === pkg.id;

            return (
              <article
                key={pkg.id}
                className="rounded-2xl border border-slate-200/90 bg-white p-5 hover:border-emerald-600/40 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Tên gói + Trạng thái */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          #{pkg.id}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900">
                          {pkg.name}
                        </h3>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                      {isActive ? "Đang mở bán" : "Tạm dừng"}
                    </span>
                  </div>

                  {/* Thông số giá, kỳ hạn, khối lượng */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 border border-slate-200/60 p-3 text-xs">
                    <div>
                      <span className="block text-[11px] text-slate-500">Giá gói</span>
                      <span className="font-extrabold text-[#064e2e] tabular-nums">
                        {formatCurrencyVnd(pkg.price)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-500">Kỳ hạn</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {pkg.duration_months} tháng
                      </span>
                    </div>
                    <div>
                      <span className="block text-[11px] text-slate-500">Mỗi lần giao</span>
                      <span className="font-bold text-slate-800 inline-flex items-center gap-1 tabular-nums">
                        <Scale className="w-3 h-3 text-emerald-600" />
                        {pkg.weight_per_delivery} kg
                      </span>
                    </div>
                  </div>

                  {/* Thành phần nông sản trong gói */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Sprout className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Thành phần mỗi đợt giao ({pkg.items?.length || 0} món)</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(pkg.items || []).map((item) => (
                        <span
                          key={`${pkg.id}-${item.product_id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-1 text-xs font-semibold text-emerald-950"
                        >
                          <span>{item.product_name}</span>
                          <strong className="text-[#064e2e] tabular-nums">
                            ({item.quantity} {item.unit})
                          </strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chân thẻ: Lượt đăng ký & Nút thao tác */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Đã đăng ký:{" "}
                    <strong className="text-slate-800 tabular-nums">
                      {pkg.registrations_count || 0} khách
                    </strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => onToggleStatus(pkg)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      {isToggling ? "..." : isActive ? "Tạm dừng" : "Mở bán"}
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditPackage(pkg)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 transition-colors cursor-pointer"
                      title="Chỉnh sửa gói"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeletePackage(pkg)}
                      className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Xóa gói"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}