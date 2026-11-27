/* Page 2: Quản trị viên cấu hình thông tin cơ sở nông trại, tự động định vị GPS & bộ sưu tập hình ảnh thực tế. */
import React, { useState } from "react";
import {
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ImagePlus,
  Leaf,
  Link2,
  Loader2,
  MapPin,
  Navigation,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";

/** Nén ảnh sang WebP trước khi tải lên giúp tiết kiệm dung lượng */
async function compressImageToWebp(file) {
  if (!file || !file.type.startsWith("image/") || file.type === "image/webp") {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxWidth = 1440;
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        0.84
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function FarmProfileSettingTab({
  farmForm,
  onChangeField,
  existingImages = [],
  onUpdateExistingImages,
  newImageFiles = [],
  onChangeNewImageFiles,
  externalUrls = [],
  onChangeExternalUrls,
}) {
  const [urlInput, setUrlInput] = useState("");
  const [geocoding, setGeocoding] = useState(false);

  const handleAutoGeocode = async () => {
    // Gọi dịch vụ địa lý để chuyển địa chỉ đã nhập thành tọa độ bản đồ.
    const address = (farmForm.Dia_chi || "").trim();
    if (!address) {
      showGlobalToast("Vui lòng nhập địa chỉ cơ sở trước khi lấy tọa độ.", "error");
      return;
    }

    setGeocoding(true);
    try {
      const res = await adminApi.geocodeFarmAddress(address);
      const data = res?.data?.data ?? res?.data ?? {};
      if (data.latitude !== undefined && data.longitude !== undefined) {
        onChangeField("Vi_do", String(data.latitude));
        onChangeField("Kinh_do", String(data.longitude));
        showGlobalToast("Đã cập nhật tọa độ GPS từ địa chỉ!");
      }
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message ||
          "Không thể tự động định vị địa chỉ này. Vui lòng kiểm tra địa chỉ hoặc nhập tọa độ thủ công.",
        "error"
      );
    } finally {
      setGeocoding(false);
    }
  };

  const handleSelectFiles = async (e) => {
    // Nén ảnh được chọn sang WebP và tạo bản xem trước mà không giữ file gốc.
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (picked.length === 0) return;

    const compressed = await Promise.all(picked.map((f) => compressImageToWebp(f)));
    const added = compressed.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: "",
    }));
    onChangeNewImageFiles([...newImageFiles, ...added]);
  };

  const handleSetCoverExisting = (index) => {
    // Đưa ảnh đã chọn lên đầu danh sách để làm ảnh đại diện.
    if (index <= 0) return;
    const next = [...existingImages];
    const [chosen] = next.splice(index, 1);
    next.unshift(chosen);
    onUpdateExistingImages(next);
  };

  const handleCaptionExisting = (index, caption) => {
    // Cập nhật chú thích cho đúng ảnh hiện có tại vị trí tương ứng.
    const next = existingImages.map((item, idx) =>
      idx === index ? { ...item, caption } : item
    );
    onUpdateExistingImages(next);
  };

  const handleRemoveExisting = (index) => {
    // Loại ảnh cũ khỏi danh sách sẽ được giữ lại khi lưu.
    onUpdateExistingImages(existingImages.filter((_, idx) => idx !== index));
  };

  const handleCaptionNew = (index, caption) => {
    const next = newImageFiles.map((item, idx) =>
      idx === index ? { ...item, caption } : item
    );
    onChangeNewImageFiles(next);
  };

  const handleRemoveNew = (index) => {
    // Thu hồi URL xem trước và bỏ ảnh mới khỏi danh sách upload.
    const target = newImageFiles[index];
    if (target?.previewUrl) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onChangeNewImageFiles(newImageFiles.filter((_, idx) => idx !== index));
  };

  const handleAddExternalUrl = () => {
    // Chỉ chấp nhận URL http(s) hợp lệ để thêm ảnh từ liên kết ngoài.
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    if (!/^https?:\/\/.+/i.test(trimmed)) return;
    onChangeExternalUrls([...externalUrls, trimmed]);
    setUrlInput("");
  };

  const totalImagesCount =
    existingImages.length + newImageFiles.length + externalUrls.length;

  return (
    <div className="space-y-5">
      {/* KHỐI 1: THÔNG TIN CƠ SỞ & TỌA ĐỘ NÔNG TRẠI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột trái (7 cột): Tên, địa chỉ, tọa độ GPS */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/85 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[#006e1c] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10.5px] font-mono font-bold uppercase text-emerald-700">
                  Bảng: nong_trai
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Thông Tin Cơ Sở & Tọa Độ Xuất Kho
                </h2>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Điểm gốc tính km ship
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label
                htmlFor="farm-name"
                className="block font-bold text-slate-700 mb-1"
              >
                Tên cơ sở nông trại *
              </label>
              <input
                id="farm-name"
                type="text"
                required
                maxLength={200}
                value={farmForm.Ten_nong_trai}
                onChange={(e) => onChangeField("Ten_nong_trai", e.target.value)}
                placeholder="Ví dụ: Nông Trại Sinh Thái XanhFarm Củ Chi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="farm-address"
                className="block font-bold text-slate-700 mb-1"
              >
                Địa chỉ chi tiết cơ sở *
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <MapPin className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="farm-address"
                    type="text"
                    required
                    maxLength={255}
                    value={farmForm.Dia_chi}
                    onChange={(e) => onChangeField("Dia_chi", e.target.value)}
                    placeholder="Số đường, ấp/xã, huyện/quận, tỉnh/thành phố..."
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  type="button"
                  disabled={geocoding || !farmForm.Dia_chi?.trim()}
                  onClick={handleAutoGeocode}
                  className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-[#064e2e] font-bold text-xs whitespace-nowrap inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {geocoding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang định vị...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Lấy tọa độ GPS</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label
                  htmlFor="farm-lat"
                  className="block font-bold text-slate-700 mb-1"
                >
                  Vĩ độ GPS (Latitude) *
                </label>
                <div className="relative">
                  <Navigation className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="farm-lat"
                    type="number"
                    step="0.0000001"
                    required
                    value={farmForm.Vi_do}
                    onChange={(e) => onChangeField("Vi_do", e.target.value)}
                    placeholder="10.9985000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white font-mono text-xs sm:text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="farm-lng"
                  className="block font-bold text-slate-700 mb-1"
                >
                  Kinh độ GPS (Longitude) *
                </label>
                <div className="relative">
                  <Navigation className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="farm-lng"
                    type="number"
                    step="0.0000001"
                    required
                    value={farmForm.Kinh_do}
                    onChange={(e) => onChangeField("Kinh_do", e.target.value)}
                    placeholder="106.5123000"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white font-mono text-xs sm:text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2">
              Tọa độ này được dùng làm điểm xuất phát khi tính khoảng cách giao hàng và đồng bộ
              lên cổng Kỹ sư nông trại lẫn trang Câu chuyện thương hiệu.
            </p>
          </div>
        </section>

        {/* Cột phải (5 cột): Hồ sơ thương hiệu & Triết lý canh tác */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/85 shadow-2xs p-5 sm:p-6 space-y-3.5 text-xs">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-[#006e1c]" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
              Nội Dung Giới Thiệu Thương Hiệu
            </h2>
          </div>

          <div>
            <label
              htmlFor="farm-story"
              className="flex items-center gap-1.5 font-bold text-slate-700 mb-1"
            >
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              <span>Câu chuyện thương hiệu</span>
            </label>
            <textarea
              id="farm-story"
              rows={3}
              value={farmForm.Cau_chuyen_thuong_hieu}
              onChange={(e) => onChangeField("Cau_chuyen_thuong_hieu", e.target.value)}
              placeholder="Hành trình hình thành và sứ mệnh cung cấp nông sản sạch..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="farm-philosophy"
              className="flex items-center gap-1.5 font-bold text-slate-700 mb-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Triết lý canh tác hữu cơ</span>
            </label>
            <textarea
              id="farm-philosophy"
              rows={3}
              value={farmForm.Triet_ly_canh_tac}
              onChange={(e) => onChangeField("Triet_ly_canh_tac", e.target.value)}
              placeholder="Quy trình 100% hữu cơ, không thuốc BVTV hóa học, kiểm định định kỳ..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label
              htmlFor="farm-capacity"
              className="block font-bold text-slate-700 mb-1"
            >
              Hồ sơ năng lực & Quy mô vùng trồng
            </label>
            <textarea
              id="farm-capacity"
              rows={2}
              value={farmForm.Ho_so_nang_luc}
              onChange={(e) => onChangeField("Ho_so_nang_luc", e.target.value)}
              placeholder="Diện tích nhà màng, sản lượng cung ứng mỗi ngày, chứng nhận..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-xs text-slate-800 leading-relaxed focus:outline-none focus:border-emerald-600"
            />
          </div>
        </section>
      </div>

      {/* KHỐI 2: BỘ SƯU TẬP HÌNH ẢNH THỰC TẾ NÔNG TRẠI */}
      <section className="bg-white rounded-2xl border border-slate-200/85 shadow-2xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[#006e1c] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase text-emerald-700">
                Bảng: hinh_anh_nong_trai ({totalImagesCount} ảnh)
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                Bộ Sưu Tập Hình Ảnh Thực Tế Nông Trại
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs">
              <ImagePlus className="w-4 h-4" />
              <span>Tải ảnh từ máy tính</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleSelectFiles}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Nhập nhanh URL ảnh nếu dùng link ngoài */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddExternalUrl();
                }
              }}
              placeholder="Hoặc dán đường dẫn URL hình ảnh (https://...) rồi bấm Thêm link"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <button
            type="button"
            onClick={handleAddExternalUrl}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 text-xs font-bold text-[#064e2e] transition-colors cursor-pointer shrink-0"
          >
            + Thêm link ảnh
          </button>
        </div>

        {/* Lưới ảnh đã lưu + ảnh mới chọn */}
        {totalImagesCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center space-y-2">
            <Camera className="w-9 h-9 text-slate-300 mx-auto" />
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Chưa có hình ảnh nào trong hồ sơ nông trại
            </p>
            <p className="text-xs text-slate-500">
              Tải lên hình ảnh nhà màng, luống rau hữu cơ hoặc khu sơ chế để hiển thị trên Trang chủ
              và trang Câu chuyện thương hiệu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Ảnh đã lưu trên hệ thống */}
            {existingImages.map((img, index) => (
              <div
                key={`existing-${img.id}`}
                className={`group rounded-2xl border overflow-hidden bg-white flex flex-col justify-between transition-all ${
                  index === 0
                    ? "border-emerald-500 ring-2 ring-emerald-500/15"
                    : "border-slate-200"
                }`}
              >
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.caption || `Hình ảnh nông trại #${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    {index === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#064e2e]/90 text-[#91f78e] text-[10.5px] font-extrabold shadow-xs">
                        <Star className="w-3 h-3 fill-current" />
                        Ảnh bìa chính
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCoverExisting(index)}
                        className="px-2.5 py-1 rounded-full bg-white/90 hover:bg-[#064e2e] text-slate-700 hover:text-white text-[10.5px] font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Đặt làm ảnh bìa
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveExisting(index)}
                    title="Xóa ảnh này"
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-white/90 hover:bg-rose-600 text-rose-600 hover:text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50/70 border-t border-slate-100">
                  <input
                    type="text"
                    maxLength={255}
                    value={img.caption || ""}
                    onChange={(e) => handleCaptionExisting(index, e.target.value)}
                    placeholder="Nhập mô tả/chú thích cho ảnh..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            ))}

            {/* Ảnh mới chọn từ máy (chờ bấm Lưu Cấu Hình) */}
            {newImageFiles.map((item, index) => (
              <div
                key={item.id}
                className="rounded-2xl border border-amber-300 bg-amber-50/20 overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={item.previewUrl}
                    alt={item.caption || "Ảnh mới tải lên"}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10.5px] font-extrabold shadow-xs">
                    Ảnh mới (chờ lưu)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveNew(index)}
                    title="Bỏ ảnh này"
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-white/90 hover:bg-rose-600 text-rose-600 hover:text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-3 bg-amber-50/40 border-t border-amber-200/60">
                  <input
                    type="text"
                    maxLength={255}
                    value={item.caption}
                    onChange={(e) => handleCaptionNew(index, e.target.value)}
                    placeholder="Mô tả ảnh mới (ví dụ: Khu nhà màng 5ha)..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            ))}

            {/* Link ảnh ngoài mới thêm */}
            {externalUrls.map((url, index) => (
              <div
                key={`url-${index}`}
                className="rounded-2xl border border-blue-200 bg-blue-50/20 overflow-hidden flex flex-col justify-between"
              >
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={url}
                    alt="Ảnh từ liên kết ngoài"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10.5px] font-extrabold shadow-xs">
                    Link ảnh mới
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeExternalUrls(externalUrls.filter((_, i) => i !== index))
                    }
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-white/90 hover:bg-rose-600 text-rose-600 hover:text-white shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="p-2.5 text-[11px] font-mono text-slate-500 truncate bg-white border-t border-slate-100">
                  {url}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}