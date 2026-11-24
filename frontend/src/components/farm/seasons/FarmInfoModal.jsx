import { AlertCircle, Loader2, MapPin, X } from "lucide-react";

export default function FarmInfoModal({
  isOpen,
  farmForm,
  setFarmForm,
  farmError,
  farmSubmitting,
  onClose,
  onSubmit,
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100dvh-2rem)] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-[#064e2e] text-white flex items-center justify-between shrink-0">
          <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 truncate text-white">
            <MapPin className="w-5 h-5 text-[#86efac] shrink-0" />
            <span>Cập Nhật Cơ Sở & Địa Chỉ Nông Trại</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1.5 rounded-lg hover:bg-emerald-700/50 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="edit-farm-form"
          onSubmit={onSubmit}
          className="flex-1 overflow-y-auto min-h-0 p-5 sm:p-6 space-y-4 text-left"
        >
          {farmError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{farmError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tên Cơ Sở / Nông Trại
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Nông Trại Xanh Củ Chi"
              value={farmForm.name}
              onChange={(e) => setFarmForm({ ...farmForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Địa Chỉ Cơ Sở Nông Trại <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ví dụ: Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh"
              value={farmForm.address}
              onChange={(e) => setFarmForm({ ...farmForm, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all leading-relaxed"
              required
            />
            <p className="text-[10.5px] sm:text-[11px] text-slate-500 mt-1">
              Địa chỉ này sẽ hiển thị trên thanh điều hướng nội bộ và xuất hiện trên hồ sơ nguồn gốc nông sản.
            </p>
          </div>
        </form>

        <div className="px-5 py-3 sm:px-6 sm:py-3.5 bg-slate-50/95 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={farmSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition-all disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="edit-farm-form"
            disabled={farmSubmitting}
            className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs hover:shadow transition-all disabled:opacity-50 cursor-pointer"
          >
            {farmSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Lưu Thay Đổi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
