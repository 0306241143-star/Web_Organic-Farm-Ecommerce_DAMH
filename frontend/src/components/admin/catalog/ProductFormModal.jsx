import React, { useState, useEffect } from "react";
import {
  PackageSearch,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import CategoryDropdown from "./CategoryDropdown";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";

const UNIT_PRESETS = ["kg", "bó 200g", "bó 500g", "hộp 500g", "quả ~1.5kg", "túi 1kg"];

async function compressImageClient(file) {
  if (!file || !file.type.startsWith("image/") || file.size <= 300 * 1024) {
    return file;
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const maxW = 1200;
    let { width, height } = bitmap;

    if (width > maxW) {
      height = Math.round((height * maxW) / width);
      width = maxW;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.8)
    );

    if (!blob || blob.size >= file.size) return file;

    const webpName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
    return new File([blob], webpName, { type: "image/webp" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

export default function ProductFormModal({
  isOpen = false,
  onClose,
  editingProduct = null,
  categories = [],
  onSaved,
}) {
  const [form, setForm] = useState({
    Ma_danh_muc: "",
    Ten_san_pham: "",
    Mo_ta: "",
    Don_vi_tinh: "kg",
    Gia_ban: "",
    Ty_le_tich_diem: "1.5",
    Trang_thai: "Dang_ban",
    image_url: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingProduct) {
      setForm({
        Ma_danh_muc: String(editingProduct.category_id || ""),
        Ten_san_pham: editingProduct.name || "",
        Mo_ta: editingProduct.description || "",
        Don_vi_tinh: editingProduct.unit || "kg",
        Gia_ban: String(editingProduct.price || ""),
        Ty_le_tich_diem: String(editingProduct.reward_point_rate ?? 1),
        Trang_thai: editingProduct.status || "Dang_ban",
        image_url: editingProduct.image_url || "",
      });
      setImageFile(null);
      setImagePreview(editingProduct.image_url || "");
    } else {
      setForm({
        Ma_danh_muc: categories[0]?.id ? String(categories[0].id) : "",
        Ten_san_pham: "",
        Mo_ta: "",
        Don_vi_tinh: "kg",
        Gia_ban: "",
        Ty_le_tich_diem: "1.5",
        Trang_thai: "Dang_ban",
        image_url: "",
      });
      setImageFile(null);
      setImagePreview("");
    }
    setFormError("");
  }, [isOpen, editingProduct, categories]);

  if (!isOpen) return null;

  const handleSelectFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).");
      return;
    }
    setFormError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.Ma_danh_muc) {
      setFormError("Vui lòng chọn danh mục nông sản.");
      return;
    }
    if (!form.Ten_san_pham.trim()) {
      setFormError("Vui lòng nhập tên sản phẩm.");
      return;
    }
    if (!form.Gia_ban || Number(form.Gia_ban) < 1000) {
      setFormError("Giá bán niêm yết phải từ 1.000đ trở lên.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("Ma_danh_muc", form.Ma_danh_muc);
      fd.append("Ten_san_pham", form.Ten_san_pham.trim());
      fd.append("Mo_ta", form.Mo_ta.trim());
      fd.append("Don_vi_tinh", form.Don_vi_tinh.trim());
      fd.append("Gia_ban", form.Gia_ban);
      fd.append("Ty_le_tich_diem", form.Ty_le_tich_diem || "1");
      fd.append("Trang_thai", form.Trang_thai);

      if (imageFile) {
        const compressed = await compressImageClient(imageFile);
        fd.append("image", compressed);
      } else if (form.image_url.trim()) {
        fd.append("image_url", form.image_url.trim());
      }

      if (editingProduct) {
        const res = await adminApi.updateProduct(editingProduct.id, fd);
        const updated = res.data?.data ?? res.data;
        showGlobalToast(`Đã cập nhật sản phẩm "${form.Ten_san_pham}".`);
        onSaved(updated, true);
      } else {
        const res = await adminApi.createProduct(fd);
        const created = res.data?.data ?? res.data;
        showGlobalToast(`Đã thêm mới sản phẩm "${form.Ten_san_pham}".`);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      setFormError(
        err?.message || err?.response?.data?.message || "Không thể lưu thông tin sản phẩm."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064e2e] text-white flex items-center justify-center">
              <PackageSearch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {editingProduct ? "Cập Nhật Sản Phẩm Nông Sản" : "Thêm Sản Phẩm Nông Sản Mới"}
              </h3>
              <p className="text-xs text-slate-500">
                Thông tin niêm yết trên danh mục cửa hàng & kết nối lô thu hoạch
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          id="admin-product-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
        >
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Danh Mục Nông Sản <span className="text-red-500">*</span>
            </label>
            <CategoryDropdown
              categories={categories}
              value={form.Ma_danh_muc}
              onChange={(val) => setForm((prev) => ({ ...prev, Ma_danh_muc: val }))}
              placeholder="Chọn danh mục nông sản"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên Sản Phẩm <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.Ten_san_pham}
              onChange={(e) => setForm((prev) => ({ ...prev, Ten_san_pham: e.target.value }))}
              placeholder="Ví dụ: Xà lách Romaine hữu cơ"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Giá Bán Niêm Yết (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={form.Gia_ban}
                onChange={(e) => setForm((prev) => ({ ...prev, Gia_ban: e.target.value }))}
                placeholder="35000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Đơn Vị Tính <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.Don_vi_tinh}
                onChange={(e) => setForm((prev) => ({ ...prev, Don_vi_tinh: e.target.value }))}
                placeholder="kg / bó 200g / hộp 500g"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {UNIT_PRESETS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, Don_vi_tinh: u }))}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[10.5px] font-semibold cursor-pointer"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tỷ Lệ Tích Điểm (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.Ty_le_tich_diem}
                onChange={(e) => setForm((prev) => ({ ...prev, Ty_le_tich_diem: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạng Thái Mở Bán
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                {[
                  { value: "Dang_ban", label: "Đang mở bán" },
                  { value: "Tam_ngung", label: "Tạm ngưng" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, Trang_thai: opt.value }))}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hình Ảnh Đại Diện Sản Phẩm
            </label>
            <div className="flex items-center gap-3.5">
              <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Xem trước" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-7 h-7 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh lên (Tự động nén WebP)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleSelectFile(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={(e) => {
                    setImageFile(null);
                    setImagePreview(e.target.value);
                    setForm((prev) => ({ ...prev, image_url: e.target.value }));
                  }}
                  placeholder="Hoặc dán đường dẫn URL ảnh trực tiếp..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô Tả Đặc Điểm Canh Tác & Dinh Dưỡng
            </label>
            <textarea
              rows={3}
              value={form.Mo_ta}
              onChange={(e) => setForm((prev) => ({ ...prev, Mo_ta: e.target.value }))}
              placeholder="Mô tả hương vị, quy trình trồng nhà màng / hữu cơ, hướng dẫn bảo quản..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            Hủy Bỏ
          </button>
          <button
            type="submit"
            form="admin-product-form"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{editingProduct ? "Lưu Thay Đổi" : "Tạo Sản Phẩm"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}