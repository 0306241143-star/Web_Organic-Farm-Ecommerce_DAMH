/* Modal for previewing and printing a batch QR label. */
import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  QrCode,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Sparkles,
  Layers,
} from "lucide-react";
import { farmApi } from "../../../services/farmApi";

export default function QrPrintPreviewModal({ isOpen, onClose, batch = null }) {
  const [loading, setLoading] = useState(false);
  const [labelData, setLabelData] = useState(null);
  const [error, setError] = useState("");
  const [printSize, setPrintSize] = useState("50x50"); // "50x50" | "70x50" | "a4"
  const [copies, setCopies] = useState(1);
  const labelPrintRef = useRef(null);

  useEffect(() => {
    if (isOpen && batch) {
      setLoading(true);
      setError("");
      farmApi
        .getBatchQrPrintTemplate(batch.id)
        .then((res) => {
          const payload = res.data?.data ?? res.data ?? res ?? null;
          setLabelData(payload);
        })
        .catch((err) => {
          // Nếu chưa có QR thì thử sinh mới
          farmApi
            .generateBatchQr(batch.id)
            .then((res2) => {
              const payload2 = res2.data?.data ?? res2.data ?? res2 ?? null;
              setLabelData(payload2);
            })
            .catch((err2) => {
              setError(
                err2?.message ||
                  err2?.response?.data?.message ||
                  err?.message ||
                  err?.response?.data?.message ||
                  "Không thể tạo mã QR cho lô này. Vui lòng đảm bảo lô đã có mốc thu hoạch."
              );
            });
        })
        .finally(() => setLoading(false));
    } else {
      setLabelData(null);
      setError("");
    }
  }, [isOpen, batch]);

  if (!isOpen || !batch) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSvg = () => {
    if (!labelData?.qr_svg) return;
    const blob = new Blob([labelData.qr_svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR-${labelData.qr_code || batch.batch_code || batch.id}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const qrCodeText = labelData?.qr_code || batch.qr?.code || batch.batch_code || `LH-${batch.id}`;
  const traceUrl = labelData?.trace_url || `https://xanhfarm.vn/trace/${qrCodeText}`;
  const qrImageSrc = labelData?.qr_data_uri || (labelData?.qr_svg ? `data:image/svg+xml;base64,${btoa(labelData.qr_svg)}` : null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem trước và In Tem QR Lô Hàng"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-thermal-label, #printable-thermal-label * {
            visibility: visible !important;
          }
          #printable-thermal-label {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-purple-50/80 to-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>In Tem Mã QR Lô Hàng</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tem in nhiệt định danh dán bao bì truy xuất nguồn gốc minh chứng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Cấu hình khổ in */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Layers className="w-4 h-4 text-purple-600" />
              <span>Khổ Tem In:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: "50x50", label: "50x50mm (Tem vuông)" },
                { id: "70x50", label: "70x50mm (Tem chữ nhật)" },
                { id: "a4", label: "A4 (24 tem/trang)" },
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => setPrintSize(sz.id)}
                  className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                    printSize === sz.id
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-3" />
              <p className="text-xs text-slate-500 font-medium">Đang sinh mã QR định danh và xuất mẫu tem...</p>
            </div>
          ) : (
            <>
              {/* Bản xem trước Tem In Nhiệt (Chuẩn nhiệt 50x50 / 70x50) */}
              <div className="flex justify-center">
                <div
                  id="printable-thermal-label"
                  ref={labelPrintRef}
                  className={`border-2 border-dashed border-slate-300 rounded-3xl p-5 bg-white shadow-lg text-slate-800 transition-all ${
                    printSize === "70x50" ? "w-[340px]" : "w-[290px]"
                  }`}
                >
                  {/* Top Bar Thương Hiệu */}
                  <div className="text-center border-b border-slate-200 pb-2 mb-3">
                    <div className="text-[10.5px] font-black uppercase tracking-wider text-[#12372A]">
                      XANH FARM • HỮU CƠ CỦ CHI
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                      Hotline: 1900 8888 • TCVN 11041
                    </div>
                  </div>

                  {/* Nông Sản & Lô */}
                  <div className="text-center mb-3">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {labelData?.product_name || batch.product_name}
                    </h3>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                        {batch.plot_name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {batch.season_name}
                      </span>
                    </div>
                  </div>

                  {/* QR Code Trung Tâm */}
                  <div className="w-36 h-36 mx-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-col items-center justify-center mb-3">
                    {qrImageSrc ? (
                      <img
                        src={qrImageSrc}
                        alt="Mã QR Truy Xuất"
                        className="w-32 h-32 object-contain"
                      />
                    ) : (
                      <QrCode className="w-28 h-28 text-slate-800" />
                    )}
                  </div>

                  {/* Chuỗi Mã Định Danh */}
                  <div className="text-center mb-3">
                    <span className="font-mono font-bold text-[11px] text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md tracking-wider">
                      {qrCodeText}
                    </span>
                  </div>

                  {/* Ngày Thu Hoạch & HSD (FEFO) */}
                  <div className="grid grid-cols-2 gap-2 text-[10.5px] border-t border-slate-200 pt-2.5 mb-2">
                    <div>
                      <span className="text-slate-400 block text-[9.5px]">Thu hoạch:</span>
                      <strong className="text-slate-800">{batch.harvest_date}</strong>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[9.5px]">Hạn dùng:</span>
                      <strong className="text-emerald-700 font-extrabold">{batch.expiry_date}</strong>
                    </div>
                  </div>

                  {/* Footer Tem */}
                  <div className="text-center text-[9px] text-slate-400 border-t border-dotted border-slate-200 pt-1.5">
                    Quét camera để xem trọn vẹn nhật ký canh tác
                  </div>
                </div>
              </div>

              {/* Đường link tra cứu truy xuất nguồn gốc */}
              <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 text-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-bold text-emerald-950 block">Liên kết truy xuất công khai:</span>
                  <a
                    href={traceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 font-medium hover:underline truncate block"
                  >
                    {traceUrl}
                  </a>
                </div>
                <a
                  href={traceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-white text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100 flex items-center gap-1 shrink-0 transition-colors"
                >
                  <span>Mở xem</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!labelData?.qr_svg}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="Tải tệp vector SVG mã QR về máy tính"
            >
              <Download className="w-4 h-4" />
              <span>Tải file SVG</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !!error}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>In Tem Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
