import { useCallback, useEffect, useState } from "react";
import { Award, Loader2, Upload, X } from "lucide-react";
import InspectionResultModal from "./InspectionResultModal";

const CERT_PRESETS = [
  {
    label: "VietGAP Trồng trọt",
    name: "Chứng nhận VietGAP Trồng trọt",
    issuer: "Viện Nghiên cứu Rau quả",
  },
  {
    label: "Hữu cơ TCVN 11041",
    name: "Chứng nhận Hữu cơ Việt Nam (TCVN 11041)",
    issuer: "Trung tâm Chứng nhận Phù hợp QUACERT",
  },
  {
    label: "Kiểm định Quatest 3",
    name: "Phiếu kết quả kiểm định mẫu đất & nước",
    issuer: "Trung tâm Kỹ thuật Tiêu chuẩn Đo lường Chất lượng 3 (QUATEST 3)",
  },
  {
    label: "GlobalGAP",
    name: "Chứng nhận GlobalGAP",
    issuer: "SGS Việt Nam",
  },
];

function getTodayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addMonthsLocal(baseDateStr, months) {
  if (!baseDateStr) return "";
  const parts = baseDateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const d = new Date(parts[0], parts[1] - 1 + months, parts[2]);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function CertificateFormModal({
  editingCert,
  submitting,
  setIsFormOpen,
  batches,
  products,
  initialFormValues,
  onSubmitForm,
}) {
 const initialToday = getTodayLocal();
  const initialBatchId =
    initialFormValues?.Ma_lo_hang || initialFormValues?.batch_id || "";
  const initialProductId =
    initialFormValues?.Ma_san_pham || initialFormValues?.product_id || "";

  const [attachMode, setAttachMode] = useState(
    editingCert
      ? editingCert.batch_id
        ? "batch"
        : "product"
      : initialProductId && !initialBatchId
        ? "product"
        : "batch"
  );
  const [formState, setFormState] = useState(() =>
    editingCert
      ? {
          Ma_lo_hang: editingCert.batch_id ? String(editingCert.batch_id) : "",
          Ma_san_pham: editingCert.product_id ? String(editingCert.product_id) : "",
          Ten_chung_nhan: editingCert.name || "",
          To_chuc_cap: editingCert.issuer || "",
          Ngay_cap: editingCert.issued_date || initialToday,
          Ngay_het_han: editingCert.expiry_date || "",
        }
      : {
          Ma_lo_hang: initialBatchId ? String(initialBatchId) : "",
          Ma_san_pham: initialProductId ? String(initialProductId) : "",
          Ten_chung_nhan: "",
          To_chuc_cap: "",
          Ngay_cap: initialToday,
          Ngay_het_han: addMonthsLocal(initialToday, 12),
        }

  );
  const [fieldErrors, setFieldErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const resetFileSelection = useCallback(() => {
    setSelectedFile(null);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const handleChooseFile = (file) => {
    if (!file) return;
    const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp"];
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!allowedExts.includes(ext)) {
      setFieldErrors((prev) => ({
        ...prev,
        file: "Chỉ chấp nhận tệp định dạng PDF, JPG, JPEG, PNG hoặc WEBP.",
      }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFieldErrors((prev) => ({
        ...prev,
        file: "Dung lượng tệp vượt quá giới hạn tối đa 10MB.",
      }));
      return;
    }

    setFieldErrors((prev) => ({ ...prev, file: undefined }));
    setSelectedFile(file);
    setFilePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    });
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    const today = getTodayLocal();
    const errors = {};

    if (attachMode === "batch" && !formState.Ma_lo_hang) {
      errors.Ma_lo_hang = "Vui lòng chọn lô hàng thu hoạch để gắn chứng nhận.";
    }
    if (attachMode === "product" && !formState.Ma_san_pham) {
      errors.Ma_san_pham = "Vui lòng chọn sản phẩm nông sản áp dụng.";
    }
    if (!formState.Ten_chung_nhan.trim() || formState.Ten_chung_nhan.trim().length < 3) {
      errors.Ten_chung_nhan = "Vui lòng nhập tên chứng nhận hoặc phiếu kiểm định (tối thiểu 3 ký tự).";
    }
    if (!formState.To_chuc_cap.trim() || formState.To_chuc_cap.trim().length < 2) {
      errors.To_chuc_cap = "Vui lòng nhập tên tổ chức cấp hoặc đơn vị kiểm định.";
    }
    if (!formState.Ngay_cap) {
      errors.Ngay_cap = "Vui lòng chọn ngày cấp.";
    } else if (formState.Ngay_cap > today) {
      errors.Ngay_cap = "Ngày cấp không được lớn hơn ngày hôm nay.";
    }
    if (formState.Ngay_het_han && formState.Ngay_cap && formState.Ngay_het_han < formState.Ngay_cap) {
      errors.Ngay_het_han = "Ngày hết hạn phải sau hoặc bằng ngày cấp.";
    }
    if (!editingCert && !selectedFile) {
      errors.file = "Vui lòng tải lên tệp bản scan chứng nhận hoặc kết quả kiểm định.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const serverErrors = await onSubmitForm({ attachMode, formState, selectedFile });
    if (serverErrors === true) {
      resetFileSelection();
    } else if (serverErrors) {
      setFieldErrors(serverErrors);
    }
  };

  const inspectionProps = {
    attachMode,
    setAttachMode,
    formState,
    setFormState,
    fieldErrors,
    setFieldErrors,
    batches,
    products,
    CERT_PRESETS,
    getTodayLocal,
    addMonthsLocal,
    handleSubmitForm,
    isDragging,
    setIsDragging,
    handleChooseFile,
    selectedFile,
    filePreviewUrl,
    formatFileSize,
    resetFileSelection,
    editingCert,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingCert ? "Cập Nhật Chứng Nhận" : "Tải Chứng Nhận & Kết Quả Kiểm Định"}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && !submitting && setIsFormOpen(false)}
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/80 to-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate">
                {editingCert
                  ? "Cập Nhật Hồ Sơ Chứng Nhận"
                  : "Tải Chứng Nhận & Kết Quả Kiểm Định"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Gắn bản scan PDF/hình ảnh vào lô hàng thu hoạch hoặc sản phẩm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            disabled={submitting}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Đóng hộp thoại"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <InspectionResultModal {...inspectionProps} />

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsFormOpen(false)}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy Bỏ
          </button>

          <button
            type="submit"
            form="certificate-upload-form"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu hồ sơ...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{editingCert ? "Lưu Thay Đổi" : "Lưu & Gắn Chứng Nhận"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
