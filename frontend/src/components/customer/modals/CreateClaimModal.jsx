import { useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { customerApi } from "../../../services/customerApi";
import { notifyApiErrorToast } from "../../../services/axiosClient";

const MAX_EVIDENCE_FILES = 5;
const MAX_TOTAL_EVIDENCE_BYTES = 35 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

const REASONS = [
  "Sản phẩm bị hư hỏng",
  "Thiếu sản phẩm",
  "Giao sai sản phẩm",
  "Chất lượng không đúng mô tả",
  "Vấn đề khác",
];

export default function CreateClaimModal({ order, onClose, onSubmitted }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    // Gửi lý do và tập tin bằng chứng của khiếu nại kèm mã đơn hàng.
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      await customerApi.createClaim({
        order_id: order.order_id,
        reason,
        description: description.trim(),
        evidence,
      });
      onSubmitted();
    } catch (error) {
      notifyApiErrorToast(error, "Không thể gửi khiếu nại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFiles = (event) => {
    // Kiểm tra số lượng, định dạng và dung lượng bằng chứng trước khi đính kèm.
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    const showWarning = (message) => {
      window.dispatchEvent(new CustomEvent("app:toast", {
        detail: { type: "warning", message },
      }));
    };

    if (files.length > MAX_EVIDENCE_FILES) {
      showWarning("Chỉ được tải tối đa 5 tệp minh chứng.");
      return;
    }

    const invalidFile = files.find((file) => {
      const isImage = IMAGE_TYPES.has(file.type);
      const isVideo = VIDEO_TYPES.has(file.type);
      return !isImage && !isVideo
        || (isImage && file.size > 10 * 1024 * 1024)
        || (isVideo && file.size > 20 * 1024 * 1024);
    });
    if (invalidFile) {
      showWarning("Chỉ hỗ trợ ảnh JPG, PNG, WebP tối đa 10 MB hoặc video MP4, MOV, WebM, M4V tối đa 20 MB.");
      return;
    }

    if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_EVIDENCE_BYTES) {
      showWarning("Tổng dung lượng ảnh và video không được vượt quá 35 MB.");
      return;
    }

    setEvidence(files);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-claim-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="create-claim-title" className="text-xl font-extrabold text-slate-900">
              Gửi khiếu nại đơn #{order.order_id}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Mô tả vấn đề và đính kèm ảnh hoặc video để đội ngũ hỗ trợ kiểm tra.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="claim-reason" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Lý do khiếu nại
            </label>
            <select
              id="claim-reason"
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
            >
              {REASONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="claim-description" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Mô tả chi tiết
            </label>
            <textarea
              id="claim-description"
              required
              minLength={10}
              maxLength={5000}
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Cho chúng tôi biết vấn đề bạn gặp phải..."
              className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-700 focus:outline-none"
            />
            <p className="mt-1 text-right text-xs text-slate-400">{description.length}/5000</p>
          </div>

          <div>
            <label htmlFor="claim-evidence" className="mb-1.5 block text-sm font-semibold text-slate-700">
              Ảnh/video minh chứng (tối đa 5 tệp; ảnh 10 MB, video 20 MB; tổng 35 MB)
            </label>
            <label
              htmlFor="claim-evidence"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              <ImagePlus className="h-5 w-5" />
              Chọn ảnh JPG, PNG, WebP hoặc video MP4, MOV, WebM, M4V
            </label>
            <input
              id="claim-evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-m4v"
              multiple
              onChange={handleFiles}
              className="sr-only"
            />
            {evidence.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {evidence.map((file) => (
                  <li key={`${file.name}-${file.lastModified}`} className="flex justify-between gap-2">
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting || description.trim().length < 10}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {submitting ? "Đang gửi..." : "Gửi khiếu nại"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
