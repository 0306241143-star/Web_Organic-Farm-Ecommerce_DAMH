import React, { useState, useEffect } from "react";
import { FolderTree, X, Loader2, AlertCircle } from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";

export default function CategoryFormModal({
  isOpen = false,
  onClose,
  editingCategory = null,
  onSaved,
}) {
  const [form, setForm] = useState({
    Ten_danh_muc: "",
    Mo_ta: "",
    Trang_thai: "Hoat_dong",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Đồng bộ form với danh mục đang sửa hoặc khởi tạo form trống.
    if (editingCategory) {
      setForm({
        Ten_danh_muc: editingCategory.name || "",
        Mo_ta: editingCategory.description || "",
        Trang_thai: editingCategory.status || "Hoat_dong",
      });
    } else {
      setForm({
        Ten_danh_muc: "",
        Mo_ta: "",
        Trang_thai: "Hoat_dong",
      });
    }
    setFormError("");
  }, [isOpen, editingCategory]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    // Không cho gửi danh mục khi thiếu tên bắt buộc.
    e.preventDefault();
    setFormError("");

    if (!form.Ten_danh_muc.trim()) {
      setFormError("Vui lòng nhập tên danh mục nông sản.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingCategory) {
        const res = await adminApi.updateCategory(editingCategory.id, form);
        const updated = res.data?.data ?? res.data;
        showGlobalToast(`Đã cập nhật danh mục "${form.Ten_danh_muc}".`);
        onSaved(updated, true);
      } else {
        const res = await adminApi.createCategory(form);
        const created = res.data?.data ?? res.data;
        showGlobalToast(`Đã thêm mới danh mục "${form.Ten_danh_muc}".`);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      setFormError(err?.message || err?.response?.data?.message || "Không thể lưu danh mục.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục"}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="relative w-full sm:max-w-md max-h-[92dvh] sm:max-h-[92vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064e2e] text-white flex items-center justify-center shrink-0">
              <FolderTree className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-800 leading-tight">
                {editingCategory ? "Chỉnh Sửa Danh Mục" : "Thêm Danh Mục Mới"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân nhóm nông sản hữu cơ trên hệ thống
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng biểu mẫu"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="admin-category-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên Danh Mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.Ten_danh_muc}
              onChange={(e) => setForm((prev) => ({ ...prev, Ten_danh_muc: e.target.value }))}
              placeholder="Ví dụ: Rau ăn lá hữu cơ"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô Tả Danh Mục
            </label>
            <textarea
              rows={3}
              value={form.Mo_ta}
              onChange={(e) => setForm((prev) => ({ ...prev, Mo_ta: e.target.value }))}
              placeholder="Mô tả ngắn gọn về nhóm nông sản trong danh mục này..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Trạng Thái Danh Mục
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              {[
                { value: "Hoat_dong", label: "Hoạt động" },
                { value: "Tam_an", label: "Tạm ẩn" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, Trang_thai: opt.value }))}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    form.Trang_thai === opt.value
                      ? "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </form>
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer disabled:opacity-50"
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            form="admin-category-form"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingCategory ? "Lưu Thay Đổi" : "Tạo Danh Mục"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}