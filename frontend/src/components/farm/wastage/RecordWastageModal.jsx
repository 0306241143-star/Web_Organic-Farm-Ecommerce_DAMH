import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Phiếu Kiểm Kho & Ghi Nhận Hao Hụt
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {productName} • Mã lô: <span className="font-mono font-bold">{batch.batch_code}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Loại thao tác kho *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Xuat_huy", label: "Xuất hủy hư hỏng" },
                { value: "Hao_hut", label: "Hao hụt tự nhiên" },
                { value: "Dieu_chinh", label: "Điều chỉnh kiểm kê" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMovementType(opt.value)}
                  className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    movementType === opt.value
                      ? "border-[#00450d] bg-[#00450d]/5 text-[#00450d]"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Số lượng trừ kho ({unit}) *
              </label>
              <button
                type="button"
                onClick={() => setQuantity(String(maxQty))}
                className="text-[11px] font-bold text-rose-700 hover:underline cursor-pointer"
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
              placeholder={`Tối đa ${maxQty} ${unit}`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:border-[#00450d]"
            />
            <div className="mt-2 flex justify-between rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <span>Tồn hiện tại: <strong>{maxQty} {unit}</strong></span>
              <span>Tồn sau khi trừ: <strong className="text-[#00450d]">{remainingAfter} {unit}</strong></span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Lý do xuất hủy / chênh lệch *</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] cursor-pointer ${
                    reason === preset
                      ? "border-[#00450d] bg-[#00450d] text-white font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
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
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-[#00450d]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-700 text-white font-bold hover:bg-rose-800 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Đang cập nhật kho..." : "Xác nhận trừ kho"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}