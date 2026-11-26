import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Printer,
  QrCode,
  User,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function BatchDetailPanel({
  selectedBatch,
  detailBatch,
  loadingDetail,
  detailSubTab,
  setDetailSubTab,
  allBatches = [],
  handleSelectBatch,
  setActiveQrBatch,
  handleOpenWastage,
}) {
  // Trên Mobile khi chưa chọn lô thì không chiếm diện tích màn hình; trên Desktop hiện khung hướng dẫn
  if (!selectedBatch) {
    return (
      <div className="hidden lg:flex lg:col-span-5 min-w-0 flex-col h-full min-h-0">
        <div className="flex-1 h-full min-h-0 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
            <QrCode className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            Chi Tiết Lô Hàng & Tem QR
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            Nhấp chọn một <strong>lô thu hoạch</strong> ở danh sách bên trái để xem thông tin tồn kho, xuất in tem QR truy xuất nguồn gốc hoặc gắn chứng nhận.
          </p>

          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 max-w-xs text-left space-y-1.5">
            <div className="font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Truy xuất nguồn gốc FEFO:</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Mỗi lô thu hoạch được cấp mã QR riêng liên kết trực tiếp với nhật ký canh tác và giấy chứng nhận chất lượng.
            </p>
            <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-slate-400">
              Tổng số lô đang quản lý:{" "}
              <strong className="text-slate-600">{allBatches.length} lô</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeBatch = detailBatch || selectedBatch;
  const percentLeft = Math.min(
    100,
    Math.round(
      (activeBatch.remaining_quantity / (activeBatch.harvest_quantity || 1)) * 100
    )
  );
  const certCount =
    detailBatch?.certificates?.length ?? activeBatch.certificates_count ?? 0;

  return (
    <>
      {/* Lớp nền mờ chỉ hiện trên Mobile khi mở Bottom Sheet */}
      <div
        onClick={() => handleSelectBatch(null)}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-2xs lg:hidden"
        aria-hidden="true"
      />

      {/* Bottom Sheet trên Mobile -> Cột phải cố định trên Desktop */}
      <div
        id="batch-detail-panel"
        className="fixed inset-x-0 bottom-0 z-50 h-[88dvh] rounded-t-3xl bg-white shadow-2xl border-t border-slate-200 flex flex-col overflow-hidden lg:static lg:inset-auto lg:z-auto lg:h-full lg:min-h-0 lg:rounded-2xl lg:border lg:border-slate-200/90 lg:shadow-xs lg:col-span-5 min-w-0"
      >
        {/* Thanh kéo nhận diện Bottom Sheet trên Mobile */}
        <div className="lg:hidden bg-[#064e2e] flex justify-center pt-2 pb-0.5 shrink-0">
          <span className="w-10 h-1 rounded-full bg-white/35" />
        </div>

        {/* Panel Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[#064e2e] text-white flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-lg bg-white/15 text-emerald-100">
                {activeBatch.batch_code}
              </span>
              <span
                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full border ${
                  activeBatch.status === "Qua_han" || activeBatch.status === "Da_huy"
                    ? "bg-red-500/25 text-red-100 border-red-300/40"
                    : activeBatch.status === "Sap_het_han"
                      ? "bg-amber-400/25 text-amber-100 border-amber-300/40"
                      : "bg-emerald-400/20 text-emerald-100 border-emerald-300/30"
                }`}
              >
                {activeBatch.status_label}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white mt-1.5 leading-snug break-words">
              {activeBatch.product_name}
            </h3>
            <p className="text-xs text-emerald-200/90 mt-0.5 truncate">
              {activeBatch.plot_name} · {activeBatch.season_name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelectBatch(null)}
            className="p-2 rounded-xl bg-white/10 lg:bg-transparent text-emerald-100 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="Đóng bảng chi tiết"
            aria-label="Đóng bảng chi tiết lô hàng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bộ chuyển nhanh sang lô khác ngay trong sheet trên Mobile */}
        {allBatches.length > 1 && (
          <div className="lg:hidden px-4 py-2.5 bg-slate-50 border-b border-slate-200/80 shrink-0">
            <select
              aria-label="Chuyển nhanh sang lô hàng khác"
              value={activeBatch.id}
              onChange={(e) => {
                const next = allBatches.find(
                  (b) => String(b.id) === String(e.target.value)
                );
                if (next) handleSelectBatch(next);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {allBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_code} — {b.product_name} ({b.remaining_quantity}{" "}
                  {b.product_unit})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="overflow-y-auto scrollbar-thin flex-1">
          {/* Bảng Thao Tác Điều Khiển */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveQrBatch(activeBatch)}
                className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Xem & In Tem QR</span>
              </button>

              <Link
                to={
                  certCount > 0
                    ? `/farm/certificates?batch_id=${activeBatch.id}`
                    : `/farm/certificates?batch_id=${activeBatch.id}&upload=1`
                }
                className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all"
              >
                <Award className="w-4 h-4 shrink-0" />
                <span>
                  {certCount > 0 ? `Chứng Nhận (${certCount})` : "Gắn Chứng Nhận"}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => handleOpenWastage(activeBatch)}
                disabled={activeBatch.remaining_quantity <= 0}
                className="px-3 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  {activeBatch.remaining_quantity > 0 ? "Xuất Hao Hụt" : "Đã Xuất Hết"}
                </span>
              </button>
            </div>
          </div>

          {/* Thông Tin Chi Tiết Lô Hàng */}
          <div className="p-3.5 sm:p-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Ngày Thu Hoạch
                </span>
                <strong className="text-slate-800 tabular-nums mt-0.5 block">
                  {activeBatch.harvest_date}
                </strong>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Hạn Sử Dụng
                </span>
                <strong className="text-emerald-700 tabular-nums mt-0.5 block">
                  {activeBatch.expiry_date}
                </strong>
                <span
                  className={`text-[10.5px] font-semibold mt-0.5 block ${
                    activeBatch.days_until_expiry < 0
                      ? "text-red-600"
                      : activeBatch.days_until_expiry <= 2
                        ? "text-amber-700"
                        : "text-slate-500"
                  }`}
                >
                  {activeBatch.days_until_expiry < 0
                    ? "Đã quá hạn"
                    : `Còn ${activeBatch.days_until_expiry} ngày`}
                </span>
              </div>
            </div>

            {/* Tồn kho & Người phụ trách */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-semibold">Tồn kho khả dụng</span>
                <strong className="text-slate-800 tabular-nums">
                  {activeBatch.remaining_quantity} / {activeBatch.harvest_quantity}{" "}
                  {activeBatch.product_unit} ({percentLeft}%)
                </strong>
              </div>
              <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    percentLeft > 40
                      ? "bg-emerald-500"
                      : percentLeft > 15
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${percentLeft}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 min-w-0 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{activeBatch.staff_name}</span>
                </span>
                <span className="tabular-nums shrink-0">
                  Hao hụt:{" "}
                  <strong className="text-slate-700">
                    {activeBatch.wastage_total || 0} {activeBatch.product_unit}
                  </strong>
                </span>
              </div>
            </div>

            {/* Sub-tabs: Chứng nhận | Nhật ký canh tác | Hao hụt kho */}
            <div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/70 mb-3">
                {[
                  {
                    id: "certificates",
                    label: `Chứng nhận (${detailBatch?.certificates?.length ?? certCount})`,
                  },
                  {
                    id: "timeline",
                    label: `Nhật ký (${detailBatch?.timeline?.length ?? 0})`,
                  },
                  {
                    id: "disposals",
                    label: `Hao hụt (${detailBatch?.disposals?.length ?? 0})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailSubTab(tab.id)}
                    className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all cursor-pointer truncate ${
                      detailSubTab === tab.id
                        ? "bg-white text-emerald-800 shadow-2xs"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {loadingDetail ? (
                <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Đang tải hồ sơ chi tiết...</span>
                </div>
              ) : detailSubTab === "certificates" ? (
                <div className="space-y-2">
                  {detailBatch?.certificates && detailBatch.certificates.length > 0 ? (
                    detailBatch.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 break-words leading-snug">
                            {cert.name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 break-words">
                            {cert.issuer} · Cấp {cert.issued_date}
                          </p>
                        </div>
                        {cert.file_available ? (
                          <a
                            href={cert.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 text-[11px] font-bold shrink-0 transition-colors"
                          >
                            <span>Xem</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <Link
                            to={`/farm/certificates?batch_id=${activeBatch.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold shrink-0"
                          >
                            <span>Chi tiết</span>
                          </Link>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-2">
                      <p>Chưa có chứng nhận hoặc kết quả kiểm định gắn cho lô này.</p>
                      <Link
                        to={`/farm/certificates?batch_id=${activeBatch.id}&upload=1`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tải & Gắn Chứng Nhận Ngay</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : detailSubTab === "timeline" ? (
                <div>
                  {detailBatch?.timeline && detailBatch.timeline.length > 0 ? (
                    <div className="relative pl-5 border-l-2 border-emerald-200 space-y-3 ml-1.5">
                      {detailBatch.timeline.map((item) => (
                        <div key={item.id} className="relative">
                          <div className="absolute -left-[25px] top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs">
                            <div className="flex items-center justify-between gap-2 text-[10px] mb-1">
                              <span className="font-bold uppercase text-emerald-800">
                                {item.activity_type}
                              </span>
                              <span className="text-slate-400 tabular-nums">
                                {item.action_time}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed break-words">
                              {item.content}
                            </p>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Người ghi nhận: {item.staff_name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-5 text-center text-xs text-slate-400 italic">
                      Chưa có nhật ký canh tác chi tiết cho lô đất này.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {detailBatch?.disposals && detailBatch.disposals.length > 0 ? (
                    detailBatch.disposals.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-red-700 tabular-nums">
                            - {d.quantity} {activeBatch.product_unit}
                          </span>
                          <span className="text-[10.5px] text-slate-400 tabular-nums">
                            {d.recorded_at}
                          </span>
                        </div>
                        <p className="text-slate-700 break-words">{d.reason}</p>
                        <p className="text-[10.5px] text-slate-500">
                          Ghi nhận bởi: {d.staff_name}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="py-5 text-center text-xs text-slate-400 italic">
                      Lô hàng này chưa ghi nhận hao hụt hay xuất hủy nào.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}