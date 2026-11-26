import {
  Award,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  PackageCheck,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function CertificateDetailPanel({
  selectedCert,
  onClose,
  allCertificates = [],
  onSelectCert,
  renderValidityBadge,
  openEditModal,
  setDeletingCert,
}) {
  // Trên Mobile khi chưa chọn hồ sơ thì không chiếm diện tích màn hình; trên Desktop hiện khung hướng dẫn
  if (!selectedCert) {
    return (
      <div className="hidden lg:flex lg:col-span-5 min-w-0 flex-col h-full min-h-0">
        <div className="flex-1 h-full min-h-0 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            Xem Trước Hồ Sơ Chứng Nhận
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Nhấp chọn một <strong>giấy chứng nhận hoặc phiếu kiểm định</strong> ở danh sách bên trái để xem bản scan gốc và kiểm tra phạm vi áp dụng.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 max-w-xs text-left space-y-1.5">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Liên kết minh bạch QR:</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Các chứng nhận gắn theo lô hàng hoặc sản phẩm sẽ hiển thị công khai khi khách hàng quét mã QR truy xuất nguồn gốc.
            </p>
            <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-400">
              Tổng số hồ sơ hiện có:{" "}
              <strong className="text-slate-600">{allCertificates.length} hồ sơ</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Lớp nền mờ chỉ hiện trên Mobile khi mở Bottom Sheet */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-2xs lg:hidden"
        aria-hidden="true"
      />

      {/* Bottom Sheet trên Mobile -> Cột phải cố định trên Desktop */}
      <div className="fixed inset-x-0 bottom-0 z-50 h-[88dvh] rounded-t-3xl bg-white shadow-2xl border-t border-slate-200 flex flex-col overflow-hidden lg:static lg:inset-auto lg:z-auto lg:h-full lg:min-h-0 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:shadow-xs lg:col-span-5 min-w-0">
        {/* Thanh kéo nhận diện Bottom Sheet trên Mobile */}
        <div className="lg:hidden bg-[#064e2e] flex justify-center pt-2 pb-0.5 shrink-0">
          <span className="w-10 h-1 rounded-full bg-white/35" />
        </div>

        {/* Panel Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[#064e2e] text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-white/15 text-emerald-100">
                <Award className="w-3 h-3" />
                <span>{selectedCert.batch_id ? "Gắn lô hàng" : "Theo sản phẩm"}</span>
              </span>
              {selectedCert.batch_code && (
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-400/20 text-emerald-100 border border-emerald-300/30">
                  {selectedCert.batch_code}
                </span>
              )}
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white mt-1.5 leading-snug break-words">
              {selectedCert.name}
            </h3>
            <p className="text-xs text-emerald-200/90 mt-0.5 truncate">
              {selectedCert.issuer}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 lg:bg-transparent text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="Đóng xem trước"
            aria-label="Đóng xem trước chứng nhận"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bộ chuyển nhanh sang hồ sơ khác ngay trong sheet trên Mobile */}
        {allCertificates.length > 1 && (
          <div className="lg:hidden px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 shrink-0">
            <select
              aria-label="Chuyển nhanh sang chứng nhận khác"
              value={selectedCert.id}
              onChange={(e) => {
                const next = allCertificates.find(
                  (c) => String(c.id) === String(e.target.value)
                );
                if (next) onSelectCert(next);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allCertificates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.product_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Nội dung chi tiết & Xem trước bản scan */}
        <div className="overflow-y-auto scrollbar-thin flex-1 p-3.5 sm:p-4 space-y-3.5">
          {/* Thanh nút thao tác */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedCert.file_available && (
              <a
                href={selectedCert.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Mở / Tải Tệp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => openEditModal(selectedCert)}
              className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>Chỉnh sửa</span>
            </button>

            <button
              type="button"
              onClick={() => setDeletingCert(selectedCert)}
              className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Xóa</span>
            </button>
          </div>

          {/* Thông tin hiệu lực & Phạm vi */}
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Trạng Thái Hiệu Lực
              </span>
              <div className="mt-1">{renderValidityBadge(selectedCert)}</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Sản Phẩm Áp Dụng
              </span>
              <strong className="text-slate-800 mt-1 block truncate">
                {selectedCert.product_name}
              </strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Ngày Cấp
              </span>
              <strong className="text-slate-800 tabular-nums mt-0.5 block">
                {selectedCert.issued_date}
              </strong>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Hạn Hiệu Lực
              </span>
              <strong className="text-emerald-700 tabular-nums mt-0.5 block">
                {selectedCert.expiry_date || "Theo đợt kiểm định"}
              </strong>
            </div>
          </div>

          {/* Liên kết lô thu hoạch nếu có */}
          {selectedCert.batch_id && (
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="text-[10.5px] font-bold uppercase text-emerald-800 block">
                  Lô Thu Hoạch Liên Kết
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedCert.batch_code}
                </span>
                {selectedCert.plot_name && (
                  <span className="text-slate-500"> · {selectedCert.plot_name}</span>
                )}
              </div>
              <Link
                to={`/farm/batches?search=${selectedCert.batch_id}`}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 border border-emerald-200 font-bold text-[11px] transition-colors"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                <span>Mở lô hàng</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* Vùng xem trước tệp bản scan */}
          {selectedCert.file_available ? (
            selectedCert.file_kind === "image" ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-2 flex items-center justify-center">
                <img
                  src={selectedCert.file_url}
                  alt={selectedCert.name}
                  className="max-h-[48vh] w-auto object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
                <iframe
                  title={selectedCert.name}
                  src={selectedCert.file_url}
                  className="w-full h-[48vh]"
                />
              </div>
            )
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-center space-y-2.5">
              <FileText className="w-9 h-9 text-amber-600 mx-auto" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                  Chưa có tệp bản scan trên máy chủ
                </h4>
                <p className="text-[11.5px] text-slate-600 mt-1">
                  Bạn có thể tải lên tệp PDF hoặc ảnh chụp chứng nhận thật để thay thế.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditModal(selectedCert)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải Bản Scan Thay Thế</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}