import React, { useState, useEffect } from "react";
import {
  PackageSearch,
  X,
  Upload,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  Star,
  Trash2,
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
  });

  // Danh sách bộ sưu tập ảnh: [{ id, preview, path?, file?, isUrl? }]
  const [galleryItems, setGalleryItems] = useState([]);
  const [urlInput, setUrlInput] = useState("");
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
      });

      const existingGallery =
        Array.isArray(editingProduct.images) && editingProduct.images.length > 0
          ? editingProduct.images.map((img, idx) => ({
              id: `existing-${idx}-${img.path || img.url}`,
              preview: img.url,
              path: img.path || img.url,
            }))
          : editingProduct.image_url
            ? [
                {
                  id: `existing-0-${editingProduct.image_url}`,
                  preview: editingProduct.image_url,
                  path: editingProduct.image_path || editingProduct.image_url,
                },
              ]
            : [];

      setGalleryItems(existingGallery);
    } else {
      setForm({
        Ma_danh_muc: categories[0]?.id ? String(categories[0].id) : "",
        Ten_san_pham: "",
        Mo_ta: "",
        Don_vi_tinh: "kg",
        Gia_ban: "",
        Ty_le_tich_diem: "1.5",
        Trang_thai: "Dang_ban",
      });
      setGalleryItems([]);
    }
    setUrlInput("");
    setFormError("");
  }, [isOpen, editingProduct, categories]);

  if (!isOpen) return null;

  const handleSelectFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      setFormError("Chỉ chấp nhận các tệp hình ảnh hợp lệ (JPG, PNG, WEBP).");
    } else {
      setFormError("");
    }

    const availableSlots = Math.max(0, 10 - galleryItems.length);
    const picked = validFiles.slice(0, availableSlots).map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${file.name}`,
      preview: URL.createObjectURL(file),
      file,
    }));

    if (picked.length > 0) {
      setGalleryItems((prev) => [...prev, ...picked]);
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (galleryItems.length >= 10) {
      setFormError("Mỗi sản phẩm tối đa 10 hình ảnh.");
      return;
    }
    setFormError("");
    setGalleryItems((prev) => [
      ...prev,
      {
        id: `url-${Date.now()}`,
        preview: trimmed,
        path: trimmed,
        isUrl: true,
      },
    ]);
    setUrlInput("");
  };

  const handleSetPrimary = (targetId) => {
    setGalleryItems((prev) => {
      const target = prev.find((item) => item.id === targetId);
      if (!target) return prev;
      return [target, ...prev.filter((item) => item.id !== targetId)];
    });
  };

  const handleRemoveImage = (targetId) => {
    setGalleryItems((prev) => prev.filter((item) => item.id !== targetId));
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

      if (editingProduct) {
        // Gửi rõ mảng retained_images (kể cả khi rỗng nếu Admin xóa hết ảnh cũ)
        const retained = galleryItems.filter((item) => !item.file && !item.isUrl);
        if (retained.length === 0) {
          fd.append("retained_images", "");
        } else {
          retained.forEach((item) => fd.append("retained_images[]", item.path));
        }
      }

      // Nén & đính kèm các tệp ảnh mới chọn theo đúng thứ tự
      for (const item of galleryItems) {
        if (item.file) {
          const compressed = await compressImageClient(item.file);
          fd.append("images[]", compressed);
        } else if (item.isUrl && item.path) {
          fd.append("gallery_urls[]", item.path);
        }
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
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
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
                Thông tin niêm yết trên cửa hàng & bộ sưu tập hình ảnh sản phẩm
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

          {/* Bộ sưu tập nhiều hình ảnh sản phẩm */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Thư Viện Hình Ảnh Sản Phẩm ({galleryItems.length}/10)
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ảnh đầu tiên là ảnh đại diện chính. Có thể chọn nhiều ảnh cùng lúc.
                </p>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs font-bold cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Chọn nhiều ảnh</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    handleSelectFiles(e.target.files);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {/* Thêm qua URL */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUrl();
                  }
                }}
                placeholder="Hoặc dán URL ảnh sản phẩm rồi bấm Thêm..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-[#064e2e] inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm URL</span>
              </button>
            </div>

            {/* Lưới hiển thị các ảnh đã thêm */}
            {galleryItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white py-5 text-center space-y-1">
                <ImageIcon className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  Chưa có hình ảnh nào. Hãy tải lên ảnh chụp thực tế của nông sản.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {galleryItems.map((item, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <div
                      key={item.id}
                      className={`group relative aspect-square rounded-2xl overflow-hidden border bg-white ${
                        isPrimary
                          ? "border-2 border-[#064e2e] ring-2 ring-emerald-500/20"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={item.preview}
                        alt={`Ảnh ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {isPrimary ? (
                        <span className="absolute left-1.5 top-1.5 px-2 py-0.5 rounded-md bg-[#064e2e] text-white text-[10px] font-extrabold shadow-xs">
                          Ảnh chính
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(item.id)}
                          title="Đặt làm ảnh đại diện chính"
                          className="absolute left-1.5 top-1.5 p-1 rounded-lg bg-white/90 hover:bg-[#064e2e] text-slate-700 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(item.id)}
                        title="Xóa ảnh này"
                        className="absolute right-1.5 top-1.5 p-1 rounded-lg bg-white/90 hover:bg-rose-600 text-rose-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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