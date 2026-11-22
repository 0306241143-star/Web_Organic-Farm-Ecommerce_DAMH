import { Link } from "react-router-dom";
import { Award, Building2, ExternalLink, Eye, FileText, Image as ImageIcon, Loader2, PackageCheck, Pencil, Search, Sprout, Trash2, Upload, X } from "lucide-react";

export default function CertificateTable({
  stats,
  statusFilter,
  setStatusFilter,
  scopeFilter,
  setScopeFilter,
  searchTerm,
  setSearchTerm,
  loading,
  filteredCertificates,
  certificates,
  openCreateModal,
  renderValidityBadge,
  setPreviewCert,
  openEditModal,
  setDeletingCert,
}) {
  return (
    <>
      {/* Main Content Card */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden">
        {/* Filter & Search Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Validity Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {[
                { id: "ALL", label: "Tất cả", count: stats.total },
                { id: "valid", label: "Còn hiệu lực", count: stats.valid },
                { id: "expiring_soon", label: "Sắp hết hạn", count: stats.expiring_soon },
                { id: "expired", label: "Hết hạn", count: stats.expired },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      statusFilter === tab.id ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-slate-200">
              {[
                { id: "ALL", label: "Mọi phạm vi" },
                { id: "batch", label: "Gắn lô hàng" },
                { id: "product", label: "Theo sản phẩm" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScopeFilter(s.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    scopeFilter === s.id
                      ? "bg-emerald-50 text-emerald-800 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên chứng nhận, đơn vị, mã lô..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Loading / Empty / List */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Đang tải danh sách chứng nhận...</span>
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">
              {certificates.length === 0
                ? "Chưa có hồ sơ chứng nhận nào"
                : "Không tìm thấy chứng nhận phù hợp bộ lọc"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Tải lên giấy chứng nhận VietGAP, Hữu cơ hoặc phiếu kiểm nghiệm đất/nước và gắn trực tiếp vào lô hàng thu hoạch.
            </p>
            <button
              type="button"
              onClick={() => openCreateModal("")}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải Chứng Nhận Đầu Tiên</span>
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Chứng Nhận / Kiểm Định</th>
                    <th className="py-3.5 px-4">Lô Hàng & Nông Sản Gắn</th>
                    <th className="py-3.5 px-4">Thời Hạn Hiệu Lực</th>
                    <th className="py-3.5 px-4">Tệp Bản Scan</th>
                    <th className="py-3.5 px-5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {filteredCertificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-5 max-w-xs">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              cert.file_kind === "pdf"
                                ? "bg-red-50 text-red-600 border border-red-100"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}
                          >
                            {cert.file_kind === "pdf" ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 leading-snug break-words">
                              {cert.name}
                            </p>
                            <p className="text-[11.5px] text-slate-500 mt-0.5 flex items-center gap-1 break-words">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{cert.issuer}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {cert.batch_id ? (
                            <Link
                              to={`/farm/batches?search=${cert.batch_id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-xs font-bold transition-colors"
                              title="Mở lô hàng này trong trang Lô thu hoạch & QR"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-mono">{cert.batch_code}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0" />
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold">
                              Áp dụng chung sản phẩm
                            </span>
                          )}
                          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                            <Sprout className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{cert.product_name}</span>
                          </div>
                          {cert.plot_name && (
                            <div className="text-[11px] text-slate-400">
                              {cert.plot_name}
                              {cert.batch_harvest_date ? ` · Thu ${cert.batch_harvest_date}` : ""}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          {renderValidityBadge(cert)}
                          <div className="text-[11px] text-slate-500 tabular-nums space-y-0.5">
                            <div>Cấp: {cert.issued_date}</div>
                            <div>
                              Hết hạn:{" "}
                              <span className="font-semibold text-slate-700">
                                {cert.expiry_date || "Không giới hạn"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => setPreviewCert(cert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold transition-colors cursor-pointer max-w-[190px]"
                          title="Xem bản scan chứng nhận"
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{cert.file_name || "Xem tệp"}</span>
                        </button>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewCert(cert)}
                            className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Xem chi tiết & bản scan"
                            aria-label="Xem chi tiết chứng nhận"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(cert)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa / Gắn lại lô hàng"
                            aria-label="Chỉnh sửa chứng nhận"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingCert(cert)}
                            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Xóa hồ sơ chứng nhận"
                            aria-label="Xóa chứng nhận"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredCertificates.map((cert) => (
                <div key={cert.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800 leading-snug break-words">
                        {cert.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 break-words">{cert.issuer}</p>
                    </div>
                    {renderValidityBadge(cert)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {cert.batch_id ? (
                      <Link
                        to={`/farm/batches?search=${cert.batch_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono"
                      >
                        <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>{cert.batch_code}</span>
                      </Link>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                        Theo sản phẩm
                      </span>
                    )}
                    <span className="text-slate-700 font-semibold">{cert.product_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>Cấp: {cert.issued_date}</span>
                    <span>Hết hạn: {cert.expiry_date || "Không giới hạn"}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewCert(cert)}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem bản scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(cert)}
                      className="p-2 rounded-xl border border-slate-200 text-slate-600 cursor-pointer"
                      aria-label="Chỉnh sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingCert(cert)}
                      className="p-2 rounded-xl border border-red-200 text-red-600 cursor-pointer"
                      aria-label="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
