/* Quality certification and lab inspection report management page. */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Award,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast } from "../../components/GlobalToast";
import CertificateTable from "../../components/farm/certificates/CertificateTable";
import CertificateFormModal from "../../components/farm/certificates/CertificateFormModal";
import CertificateStatCards from "../../components/farm/certificates/CertificateStatCards";
import CertificatePreviewModal from "../../components/farm/certificates/CertificatePreviewModal";
import CertificateDeleteModal from "../../components/farm/certificates/CertificateDeleteModal";
import {
  isApiValidationError,
  notifyApiErrorToast,
} from "../../services/axiosClient";

export default function CertificateManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    expiring_soon: 0,
    expired: 0,
    batch_attached: 0,
  });
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL");

  // Upload / Edit Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [initialFormValues, setInitialFormValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Preview Modal & Delete Confirm Modal
  const [previewCert, setPreviewCert] = useState(null);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Thông báo nổi dùng chung toàn hệ thống (top-center)
  const showToast = useCallback((msg, type = "success") => {
    showGlobalToast(msg, type);
  }, []);

  const fetchCertificates = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getCertificates();
      const payload = res.data?.data ?? res.data ?? res ?? {};
      setCertificates(Array.isArray(payload.certificates) ? payload.certificates : []);
      if (payload.stats) {
        setStats(payload.stats);
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách chứng nhận. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [batchRes, prodRes] = await Promise.all([
        farmApi.getBatches(),
        farmApi.getFarmProducts(),
      ]);
      const batchPayload = batchRes.data?.data ?? batchRes.data ?? batchRes ?? {};
      setBatches(Array.isArray(batchPayload.batches) ? batchPayload.batches : []);

      const prodPayload = prodRes.data?.data ?? prodRes.data ?? prodRes ?? [];
      setProducts(Array.isArray(prodPayload) ? prodPayload : []);
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải dữ liệu chứng nhận.");
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
    fetchReferenceData();
  }, [fetchCertificates, fetchReferenceData]);

  const openCreateModal = useCallback(
    (prefillBatchId = "") => {
      const matchedBatch = batches.find((b) => String(b.id) === String(prefillBatchId));
      setEditingCert(null);
      setInitialFormValues({
        Ma_lo_hang: prefillBatchId ? String(prefillBatchId) : "",
        Ma_san_pham: matchedBatch?.product_id ? String(matchedBatch.product_id) : "",
      });
      setIsFormOpen(true);
    },
    [batches]
  );

  const openEditModal = useCallback(
    (cert) => {
      setEditingCert(cert);
      setInitialFormValues(null);
      setIsFormOpen(true);
    },
    []
  );

  // Tự mở modal khi chuyển từ trang Lô thu hoạch (?batch_id=...&upload=1)
  useEffect(() => {
    const batchIdParam = searchParams.get("batch_id");
    const uploadParam = searchParams.get("upload");
    if (uploadParam === "1" && batchIdParam) {
      openCreateModal(batchIdParam);
      setSearchParams({}, { replace: true });
    } else if (batchIdParam) {
      const matched = batches.find((b) => String(b.id) === String(batchIdParam));
      if (matched?.batch_code) {
        setSearchTerm(matched.batch_code);
      }
    }
  }, [searchParams, batches, openCreateModal, setSearchParams]);

  const handleSubmitForm = async ({ attachMode, formState, selectedFile }) => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (attachMode === "batch" && formState.Ma_lo_hang) {
        formData.append("Ma_lo_hang", formState.Ma_lo_hang);
        if (formState.Ma_san_pham) {
          formData.append("Ma_san_pham", formState.Ma_san_pham);
        }
      } else if (attachMode === "product" && formState.Ma_san_pham) {
        formData.append("Ma_san_pham", formState.Ma_san_pham);
      }

      formData.append("Ten_chung_nhan", formState.Ten_chung_nhan.trim());
      formData.append("To_chuc_cap", formState.To_chuc_cap.trim());
      formData.append("Ngay_cap", formState.Ngay_cap);
      if (formState.Ngay_het_han) {
        formData.append("Ngay_het_han", formState.Ngay_het_han);
      }
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      if (editingCert) {
        const res = await farmApi.updateCertificate(editingCert.id, formData);
        const updatedCert = res.data?.data ?? res.data;
        if (updatedCert?.id != null) {
          const previousCert =
            certificates.find((cert) => String(cert.id) === String(updatedCert.id)) ||
            editingCert;
          const wasValid = ["valid", "no_expiry"].includes(previousCert.validity_status);
          const isValid = ["valid", "no_expiry"].includes(updatedCert.validity_status);

          setCertificates((prev) =>
            prev.map((cert) =>
              String(cert.id) === String(updatedCert.id) ? updatedCert : cert
            )
          );
          setStats((prev) => ({
            ...prev,
            valid: Math.max(
              0,
              (Number(prev.valid) || 0) - Number(wasValid) + Number(isValid)
            ),
            expiring_soon: Math.max(
              0,
              (Number(prev.expiring_soon) || 0) -
                Number(previousCert.validity_status === "expiring_soon") +
                Number(updatedCert.validity_status === "expiring_soon")
            ),
            expired: Math.max(
              0,
              (Number(prev.expired) || 0) -
                Number(previousCert.validity_status === "expired") +
                Number(updatedCert.validity_status === "expired")
            ),
            batch_attached: Math.max(
              0,
              (Number(prev.batch_attached) || 0) -
                Number(Boolean(previousCert.batch_id)) +
                Number(Boolean(updatedCert.batch_id))
            ),
          }));
        }
        showToast("Đã cập nhật hồ sơ chứng nhận thành công.");
      } else {
        const res = await farmApi.uploadCertificate(formData);
        const createdCert = res.data?.data ?? res.data;
        if (createdCert?.id != null) {
          setCertificates((prev) => [
            createdCert,
            ...prev.filter((cert) => String(cert.id) !== String(createdCert.id)),
          ]);
          setStats((prev) => ({
            ...prev,
            total: (Number(prev.total) || 0) + 1,
            valid:
              (Number(prev.valid) || 0) +
              (["valid", "no_expiry"].includes(createdCert.validity_status) ? 1 : 0),
            expiring_soon:
              (Number(prev.expiring_soon) || 0) +
              (createdCert.validity_status === "expiring_soon" ? 1 : 0),
            expired:
              (Number(prev.expired) || 0) +
              (createdCert.validity_status === "expired" ? 1 : 0),
            batch_attached:
              (Number(prev.batch_attached) || 0) + (createdCert.batch_id ? 1 : 0),
          }));
        }
        showToast("Đã tải lên chứng nhận và gắn vào hồ sơ thành công.");
      }

      setIsFormOpen(false);
      return true;
    } catch (err) {
      if (isApiValidationError(err)) {
        const mapped = {};
        Object.keys(err.fieldErrors).forEach((key) => {
          const value = err.fieldErrors[key];
          mapped[key] = Array.isArray(value) ? value[0] : value;
        });
        return mapped;
      } else {
        notifyApiErrorToast(err, "Không thể lưu hồ sơ chứng nhận. Vui lòng thử lại.");
        return false;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCert) return;
    setDeleteSubmitting(true);
    try {
      await farmApi.deleteCertificate(deletingCert.id);
      setCertificates((prev) =>
        prev.filter((cert) => String(cert.id) !== String(deletingCert.id))
      );
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, (Number(prev.total) || 0) - 1),
        valid: ["valid", "no_expiry"].includes(deletingCert.validity_status)
          ? Math.max(0, (Number(prev.valid) || 0) - 1)
          : Number(prev.valid) || 0,
        expiring_soon:
          deletingCert.validity_status === "expiring_soon"
            ? Math.max(0, (Number(prev.expiring_soon) || 0) - 1)
            : Number(prev.expiring_soon) || 0,
        expired:
          deletingCert.validity_status === "expired"
            ? Math.max(0, (Number(prev.expired) || 0) - 1)
            : Number(prev.expired) || 0,
        batch_attached: deletingCert.batch_id
          ? Math.max(0, (Number(prev.batch_attached) || 0) - 1)
          : Number(prev.batch_attached) || 0,
      }));
      showToast(`Đã xóa chứng nhận "${deletingCert.name}".`);
      setDeletingCert(null);
      if (String(previewCert?.id) === String(deletingCert.id)) {
        setPreviewCert(null);
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa hồ sơ chứng nhận.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const filteredCertificates = useMemo(() => {
    return certificates.filter((item) => {
      if (statusFilter === "valid" && !["valid", "no_expiry"].includes(item.validity_status)) {
        return false;
      }
      if (statusFilter === "expiring_soon" && item.validity_status !== "expiring_soon") {
        return false;
      }
      if (statusFilter === "expired" && item.validity_status !== "expired") {
        return false;
      }
      if (scopeFilter === "batch" && !item.batch_id) return false;
      if (scopeFilter === "product" && item.batch_id) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const combined = [
          item.name,
          item.issuer,
          item.batch_code,
          item.product_name,
          item.plot_name,
          item.season_name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [certificates, statusFilter, scopeFilter, searchTerm]);

  const renderValidityBadge = (cert) => {
    if (cert.validity_status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Đã hết hạn</span>
        </span>
      );
    }
    if (cert.validity_status === "expiring_soon") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Còn {cert.days_remaining} ngày</span>
        </span>
      );
    }
    if (cert.validity_status === "no_expiry") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Theo đợt kiểm định</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Còn hiệu lực</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/70">
              <Award className="w-5 h-5" />
            </span>
            <span>Chứng Nhận & Kết Quả Kiểm Định</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Lưu trữ giấy chứng nhận VietGAP, Hữu cơ và phiếu kết quả kiểm định mẫu đất, nước gắn trực tiếp vào từng lô hàng thu hoạch để minh bạch khi truy xuất nguồn gốc.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchCertificates(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => openCreateModal("")}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tải Chứng Nhận Mới</span>
          </button>
        </div>
      </div>

      <CertificateStatCards stats={stats} />

      <CertificateTable
        stats={stats}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        scopeFilter={scopeFilter}
        setScopeFilter={setScopeFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loading={loading}
        filteredCertificates={filteredCertificates}
        certificates={certificates}
        openCreateModal={openCreateModal}
        renderValidityBadge={renderValidityBadge}
        setPreviewCert={setPreviewCert}
        openEditModal={openEditModal}
        setDeletingCert={setDeletingCert}
      />

      {isFormOpen && (
        <CertificateFormModal
          editingCert={editingCert}
          submitting={submitting}
          setIsFormOpen={setIsFormOpen}
          batches={batches}
          products={products}
          initialFormValues={initialFormValues}
          onSubmitForm={handleSubmitForm}
        />
      )}

      <CertificatePreviewModal
        previewCert={previewCert}
        setPreviewCert={setPreviewCert}
        openEditModal={openEditModal}
      />

      <CertificateDeleteModal
        deletingCert={deletingCert}
        setDeletingCert={setDeletingCert}
        deleteSubmitting={deleteSubmitting}
        handleConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
