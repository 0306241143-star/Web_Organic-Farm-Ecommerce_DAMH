import { Loader2, Trash2 } from "lucide-react";

export default function CertificateDeleteModal({
  deletingCert,
  setDeletingCert,
  deleteSubmitting,
  handleConfirmDelete,
}) {
  return (
    <>
      {/* Modal: Xác nhận xóa chứng nhận */}
      {deletingCert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xóa chứng nhận"
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && !deleteSubmitting && setDeletingCert(null)}
        >
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-800">Xóa hồ sơ chứng nhận?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">
                  Bạn có chắc muốn xóa <strong className="text-slate-800">"{deletingCert.name}"</strong>
                  {deletingCert.batch_code ? ` khỏi lô hàng ${deletingCert.batch_code}` : ""}? Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCert(null)}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteSubmitting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Xóa Chứng Nhận</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
