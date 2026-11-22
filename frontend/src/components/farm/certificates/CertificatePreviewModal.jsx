import { Award, Download, FileText, Upload, X } from "lucide-react";

export default function CertificatePreviewModal({
  previewCert,
  setPreviewCert,
  openEditModal,
}) {
  return (
    <>
      {/* Modal: Xem trước Bản Scan / PDF Chứng nhận */}
      {previewCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem bản scan chứng nhận"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setPreviewCert(null)}
        >
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 sm:px-6 py-4 bg-[#064e2e] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Award className="w-5 h-5 text-emerald-300 shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                    {previewCert.name}
                  </h3>
                  <p className="text-[11px] text-emerald-200 truncate">
                    {previewCert.issuer}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCert(null)}
                className="text-emerald-200 hover:text-white p-1.5 rounded-full cursor-pointer shrink-0"
                aria-label="Đóng cửa sổ xem tệp"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
              {/* Metadata bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Lô hàng gắn
                  </span>
                  <strong className="text-emerald-800 font-mono">
                    {previewCert.batch_code || "Áp dụng chung"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Sản phẩm
                  </span>
                  <strong className="text-slate-800">{previewCert.product_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Ngày cấp
                  </span>
                  <strong className="text-slate-800 tabular-nums">{previewCert.issued_date}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Hạn hiệu lực
                  </span>
                  <strong className="text-slate-800 tabular-nums">
                    {previewCert.expiry_date || "Theo đợt kiểm định"}
                  </strong>
                </div>
              </div>

              {/* Document Preview Area */}
              {previewCert.file_available ? (
                previewCert.file_kind === "image" ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-900/5 p-2 flex items-center justify-center">
                    <img
                      src={previewCert.file_url}
                      alt={previewCert.name}
                      className="max-h-[58vh] w-auto object-contain rounded-xl"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100">
                    <iframe
                      title={previewCert.name}
                      src={previewCert.file_url}
                      className="w-full h-[58vh]"
                    />
                  </div>
                )
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-center space-y-3">
                  <FileText className="w-10 h-10 text-amber-600 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Hồ sơ mẫu chưa có tệp bản scan thực tế trên máy chủ
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                      Đường dẫn lưu trong CSDL là <code className="font-mono">{previewCert.file_path}</code>. Bạn có thể tải tệp PDF hoặc ảnh chụp bản scan thật lên để thay thế ngay.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewCert;
                      setPreviewCert(null);
                      openEditModal(target);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải Bản Scan Thật Thay Thế</span>
                  </button>
                </div>
              )}
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              {previewCert.file_available ? (
                <a
                  href={previewCert.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Mở / Tải Bản Scan</span>
                </a>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setPreviewCert(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
