/* Modal for recording a farm log and attaching media. */
import React, { useState, useEffect } from "react";
import {
  X,
  Upload,
  Calendar,
  ClipboardList,
  Sprout,
  FlaskConical,
  Droplets,
  Scissors,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { farmApi } from "../../../services/farmApi";

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export default function AddFarmingLogModal({
  isOpen = false,
  onClose = () => {},
  onSuccess = () => {},
  plots = [],
  defaultPlotId = null,
}) {
  const [plotId, setPlotId] = useState("");
  const [activityType, setActivityType] = useState("Gieo_hat");
  const [actionTime, setActionTime] = useState(getCurrentDateTimeLocal);
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cập nhật giá trị khi mở modal hoặc thay đổi defaultPlotId
  useEffect(() => {
    if (isOpen) {
      if (defaultPlotId) {
        setPlotId(String(defaultPlotId));
      } else if (plots.length > 0) {
        setPlotId(String(plots[0].id));
      }
    }
  }, [isOpen, defaultPlotId, plots]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedFiles((prev) => [...prev, ...files]);

    // Tạo preview URL
    const newPreviews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      isVideo: file.type.startsWith("video/"),
    }));
    setFilePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!plotId) {
      setErrorMsg("Vui lòng chọn lô canh tác cần ghi nhật ký.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("Vui lòng nhập nội dung chi tiết công việc thực hiện.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData();
      formData.append("Ma_lo_canh_tac", plotId);
      formData.append("Loai_hoat_dong", activityType);
      formData.append("Thoi_gian_thuc_hien", actionTime);
      formData.append("Noi_dung", content.trim());

      selectedFiles.forEach((file) => {
        formData.append("media[]", file);
      });

      await farmApi.createFarmingLog(formData);
      onSuccess();
      onClose();
    } catch (err) {
      const respError = err?.response?.data?.message || err?.response?.data?.errors?.Noi_dung?.[0];
      setErrorMsg(respError || "Không thể lưu nhật ký. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const activityOptions = [
    { id: "Gieo_hat", label: "Gieo hạt & Ươm cây", icon: Sprout, color: "text-emerald-600" },
    { id: "Bon_phan", label: "Bón phân hữu cơ", icon: FlaskConical, color: "text-amber-600" },
    { id: "Tuoi_tieu", label: "Tưới tiêu nước sạch", icon: Droplets, color: "text-blue-600" },
    { id: "Thu_hoach", label: "Thu hoạch nông sản", icon: Scissors, color: "text-purple-600" },
    { id: "Khac", label: "Khác", icon: ClipboardList, color: "text-slate-600" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-log-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700/60 rounded-lg">
              <ClipboardList className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 id="add-log-title" className="text-base font-bold">
                Ghi Nhật Ký Canh Tác Mới
              </h3>
              <p className="text-xs text-emerald-200/90">
                Lưu trữ mốc chăm sóc mùa vụ đính kèm hình ảnh/video thực tế
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Chọn Lô canh tác */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Chọn Lô Canh Tác <span className="text-red-500">*</span>
            </label>
            <select
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              required
            >
              <option value="">-- Chọn lô canh tác --</option>
              {plots.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.plot_name} — {plot.product_name || "Nông sản"} (Mùa vụ: {plot.season_name || "Hiện tại"})
                </option>
              ))}
            </select>
          </div>

          {/* Chọn loại hoạt động */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Loại Hoạt Động <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {activityOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = activityType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setActivityType(opt.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs ring-1 ring-emerald-600"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${opt.color}`} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thời gian thực hiện */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Thời Gian Thực Hiện <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={actionTime}
                onChange={(e) => setActionTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all pl-10"
                required
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Nội dung công việc */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội Dung Chi Tiết Hoạt Động <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ví dụ: Bón 20kg phân trùn quế vi sinh cho toàn bộ 1200m2 lô xà lách. Tình trạng cây phát triển khỏe, không có sâu bệnh..."
              rows={4}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              required
            />
          </div>

          {/* Upload ảnh & video minh chứng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hình Ảnh / Video Minh Chứng Thực Tế
            </label>
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition-all">
              <Upload className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-emerald-700">
                Bấm để chọn tệp từ thiết bị
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Hỗ trợ ảnh JPG, PNG, WEBP hoặc video MP4 (tối đa 20MB/tệp)
              </span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Danh sách tệp đã chọn */}
            {filePreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3">
                {filePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-900"
                  >
                    {preview.isVideo ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white bg-slate-800 p-1 text-center">
                        🎥 Video
                      </div>
                    ) : (
                      <img
                        src={preview.url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded-full hover:bg-red-700 transition-colors"
                      title="Xóa tệp này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Đang lưu nhật ký..." : "Lưu Nhật Ký Canh Tác"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
