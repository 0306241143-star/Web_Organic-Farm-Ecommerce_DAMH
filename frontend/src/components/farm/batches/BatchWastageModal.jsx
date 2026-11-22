import { AlertCircle, AlertTriangle, Loader2, X } from "lucide-react";

export default function BatchWastageModal({
  wastageBatch,
  wastageForm,
  setWastageForm,
  wastageError,
  wastageSubmitting,
  onClose,
  onSubmit,
}) {
  if (!wastageBatch) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
            <AlertTriangle className="w-5 h-5 text-red-200" />
            <span>Kiểm Kho & Ghi Nhận Hao Hụt</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {wastageError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{wastageError}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
            <span className="text-slate-400 block mb-0.5">Lô hàng:</span>
            <strong className="text-slate-800">
              {wastageBatch.product_name} • {wastageBatch.batch_code}
            </strong>
            <div className="mt-1 text-slate-500">
              Tồn kho hiện tại:{" "}
              <strong className="text-emerald-700">
                {wastageBatch.remaining_quantity} {wastageBatch.product_unit}
              </strong>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Loại Biến Động Kho <span className="text-red-500">*</span>
            </label>
            <div className="space-y-1.5" role="radiogroup" aria-label="Loại biến động kho">
              {[
                {
                  value: "Hao_hut",
                  label: "Hao hụt tự nhiên",
                  desc: "Héo, bay hơi nước trong quá trình bảo quản",
                },
                {
                  value: "Xuat_huy",
                  label: "Xuất hủy",
                  desc: "Dập nát, hư hỏng không đủ tiêu chuẩn bán",
                },
                {
                  value: "Dieu_chinh",
                  label: "Điều chỉnh kiểm kê thực tế",
                  desc: "Cân đối lại số lượng tồn thực tế trong kho",
                },
              ].map((opt) => {
                const isSelected = wastageForm.type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setWastageForm({ ...wastageForm, type: opt.value })}
                    className={`w-full text-left px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/30"
                        : "bg-slate-50 border-slate-200 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-amber-600 bg-amber-600" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800 leading-snug">
                        {opt.label}
                      </span>
                      <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                        {opt.desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số Lượng Hao Hụt ({wastageBatch.product_unit}) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max={wastageBatch.remaining_quantity}
              placeholder={`Tối đa: ${wastageBatch.remaining_quantity}`}
              value={wastageForm.quantity}
              onChange={(e) => setWastageForm({ ...wastageForm, quantity: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý Do Ghi Nhận *
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Rau bị dập trong quá trình sơ chế, hỏng bao bì..."
              value={wastageForm.reason}
              onChange={(e) => setWastageForm({ ...wastageForm, reason: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={wastageSubmitting}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {wastageSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang trừ kho...</span>
                </>
              ) : (
                <span>Xác Nhận Trừ Kho</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
