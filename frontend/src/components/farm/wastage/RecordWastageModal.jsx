import { useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, X } from "lucide-react";

const PRESET_REASONS = [
  "Hỏng, dập nát trong quá trình lưu kho",
  "Lô hàng quá hạn sử dụng (FEFO)",
  "Hao hụt tự nhiên / bay hơi sau thu hoạch",
  "Chênh lệch kiểm đếm thực tế tại kho",
];

export default function RecordWastageModal({ batch, onClose, onSubmit, submitting }) {
  const maxQty = Number(batch.remaining_quantity ?? 0);
  const unit = batch.product_unit || "kg";
  const productName = batch.product_name || "Nông sản";

  const [movementType, setMovementType] = useState("Xuat_huy");
  const [quantity, setQuantity] = useState(batch.health === "expired" ? String(maxQty) : "");
  const [reason, setReason] = useState(
    batch.health === "expired" ? "Lô hàng quá hạn sử dụng (FEFO)" : PRESET_REASONS[0]
  );
  const [error, setError] = useState("");

  const numericQty = Number(quantity) || 0;
  const remainingAfter = Math.max(0, Number((maxQty - numericQty).toFixed(2)));

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (numericQty <= 0) {
      setError("Vui lòng nhập số lượng lớn hơn 0.");
      return;
    }
    if (numericQty > maxQty) {
      setError(`Số lượng không được vượt quá tồn kho thực tế (${maxQty} ${unit}).`);
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do ghi nhận.");
      return;
    }
    onSubmit({
      type: movementType,
      quantity: numericQty,
      reason: reason.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header đồng bộ xanh #064e2e giống các form khác */}
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#064e2e] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-[#043821] rounded-xl shrink-0">
              <ClipboardCheck className="w-5 h-5 text-[#86efac]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate text-white">
                Phiếu Kiểm Kho & Ghi Nhận Hao Hụt
              </h3>
              <p className="text-[11px] sm:text-xs text-emerald-200/90 truncate">
                {productName} · Mã lô: <span className="font-mono font-bold">{batch.batch_code}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors shrink-0 ml-2 cursor-pointer"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Form cuộn độc lập */}
        <form
          id="record-wastage-form"
          onSubmit={handleFormSubmit}
          className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-left"
        >
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loại thao tác kho */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Loại Thao Tác Kho <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Xuat_huy", label: "Xuất hủy hư hỏng" },
                { value: "Hao_hut", label: "Hao hụt tự nhiên" },
                { value: "Dieu_chinh", label: "Điều chỉnh kiểm kê" },
              ].map((opt) => {
                const active = movementType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMovementType(opt.value)}
                    className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs ring-1 ring-emerald-600"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Số lượng trừ kho */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Số Lượng Trừ Kho ({unit}) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(maxQty))}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
              >
                Xuất hủy toàn bộ ({maxQty} {unit})
              </button>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxQty}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`Nhập số lượng (tối đa ${maxQty} ${unit})`}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all tabular-nums"
            />
            <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-3.5 py-2 text-xs text-slate-700 tabular-nums">
              <span>
                Tồn hiện tại: <strong className="text-slate-900">{maxQty} {unit}</strong>
              </span>
              <span>
                Tồn sau khi trừ:{" "}
                <strong className="text-emerald-800">{remainingAfter} {unit}</strong>
              </span>
            </div>
          </div>

          {/* Lý do xuất hủy / chênh lệch */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Lý Do Xuất Hủy / Chênh Lệch <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                    reason === preset
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ghi chi tiết tình trạng lô hàng hoặc biên bản kiểm kho..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>
        </form>

        {/* Footer cố định đồng bộ các form khác */}
        <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-50/95 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="record-wastage-form"
            disabled={submitting}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{submitting ? "Đang cập nhật kho..." : "Xác Nhận Trừ Kho"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}