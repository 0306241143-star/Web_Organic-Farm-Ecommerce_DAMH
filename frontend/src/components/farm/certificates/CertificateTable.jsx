import { Link } from "react-router-dom";
import {
  Award,
  Building2,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  PackageCheck,
  Pencil,
  Sprout,
  Trash2,
  Upload,
} from "lucide-react";

export default function CertificateTable({
  loading,
  filteredCertificates = [],
  totalFilteredCount,
  certificates = [],
  openCreateModal,
  renderValidityBadge,
  setPreviewCert,
  openEditModal,
  setDeletingCert,
}) {
  const displayTotal = totalFilteredCount ?? filteredCertificates.length;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
      {/* Thanh thông tin số lượng hồ sơ */}
      {!loading && filteredCertificates.length > 0 && (
        <div className="px-3.5 sm:px-5 py-2 bg-emerald-50/50 border-b border-emerald-100/80 text-[11.5px] text-emerald-800 flex items-center justify-between gap-2">
          <span className="truncate">
            Hồ sơ chứng nhận chất lượng &amp; kiểm định gắn lô hoặc sản phẩm.
          </span>
          <span className="text-emerald-700 font-bold tabular-nums shrink-0">
            {displayTotal} hồ sơ
          </span>
        </div>
      )}

      {/* Loading / Empty / List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
          <span className="text-xs font-medium">Đang tải danh sách chứng nhận...</span>
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="py-14 px-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            {certificates.length === 0
              ? "Chưa có hồ sơ chứng nhận nào"
              : "Không tìm thấy chứng nhận phù hợp bộ lọc"}
          </h3>
          <button
            type="button"
            onClick={() => openCreateModal("")}
            className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải Chứng Nhận</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Chứng Nhận / Kiểm Định</th>
                  <th className="py-3 px-4">Lô Hàng &amp; Nông Sản Gắn</th>
                  <th className="py-3 px-4">Thời Hạn Hiệu Lực</th>
                  <th className="py-3 px-4">Tệp Bản Scan</th>
                  <th className="py-3 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 max-w-xs">
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

                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-4">
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

                    <td className="py-3.5 px-5 text-right">
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

          {/* Mobile Card List — gọn gàng, vùng chạm thoải mái */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredCertificates.map((cert) => (
              <div key={cert.id} className="p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-slate-800 leading-snug break-words">
                        {cert.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 break-words">
                        {cert.issuer}
                      </p>
                    </div>
                  </div>
                  {renderValidityBadge(cert)}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {cert.batch_id ? (
                    <Link
                      to={`/farm/batches?search=${cert.batch_id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold font-mono text-[11px]"
                    >
                      <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>{cert.batch_code}</span>
                    </Link>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[11px]">
                      Theo sản phẩm
                    </span>
                  )}
                  <span className="text-slate-700 font-semibold truncate">
                    {cert.product_name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                  <span>Cấp: {cert.issued_date}</span>
                  <span>HSD: {cert.expiry_date || "Không giới hạn"}</span>
                </div>

                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewCert(cert)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>Xem bản scan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(cert)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                    aria-label="Chỉnh sửa"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingCert(cert)}
                    className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
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
  );
}