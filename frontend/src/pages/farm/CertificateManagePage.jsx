/* Quality certification and lab inspection report management page. */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Award,
  Plus,
  RefreshCw,
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

  // =========================================================================
  // 1. STATE QUẢN LÝ DỮ LIỆU & CHỈ SỐ THỐNG KÊ CHỨNG NHẬN
  // =========================================================================
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

  // =========================================================================
  // 2. STATE BỘ LỌC TÌM KIẾM
  // =========================================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL");

  // =========================================================================
  // 3. STATE HỘP THOẠI (MODALS)
  // =========================================================================
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [initialFormValues, setInitialFormValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal xem trước và modal xác nhận xóa
  const [previewCert, setPreviewCert] = useState(null);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // =========================================================================
  // 4. API HANDLERS & TẢI DỮ LIỆU
  // =========================================================================
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

  // =========================================================================
  // 5. EVENT HANDLERS (MỞ MODAL, THÊM, SỬA, XÓA HỒ SƠ)
  // =========================================================================
  // Khởi tạo mở modal tải lên chứng nhận mới
  const openCreateModal = (defaultBatchId = "") => {
    setEditingCert(null);
    setInitialFormValues(
      defaultBatchId ? { batch_id: String(defaultBatchId) } : null
    );
    setIsFormOpen(true);
  };

  // Khởi tạo mở modal chỉnh sửa chứng nhận hiện có
  const openEditModal = (cert) => {
    setEditingCert(cert);
    setInitialFormValues({
      name: cert.name || "",
      issuer: cert.issuer || "",
      code: cert.code || "",
      issued_date: cert.issued_date || "",
      expiry_date: cert.expiry_date || "",
      batch_id: cert.batch_id ? String(cert.batch_id) : "",
      product_id: cert.product_id ? String(cert.product_id) : "",
    });
    setIsFormOpen(true);
  };

  // Tự động mở modal tải lên nếu có query trên URL
  useEffect(() => {
    const uploadParam = searchParams.get("upload");
    const batchIdParam = searchParams.get("batch_id");
    if (uploadParam === "1") {
      openCreateModal(batchIdParam || "");
      setSearchParams({});
    } else if (batchIdParam) {
      setSearchTerm(batchIdParam);
    }
  }, [searchParams, setSearchParams]);

  // Submit Form thêm hoặc cập nhật chứng nhận
  const handleSubmitForm = async (formData) => {
    setSubmitting(true);
    try {
      if (editingCert) {
        const res = await farmApi.updateCertificate(editingCert.id, formData);
        const updated = res.data?.data ?? res.data;
        if (updated?.id != null) {
          setCertificates((prev) =>
            prev.map((c) =>
              String(c.id) === String(updated.id) ? { ...c, ...updated } : c
            )
          );
          setStats((prev) => ({
            ...prev,
            valid:
              (Number(prev.valid) || 0) +
              (["valid", "no_expiry"].includes(updated.validity_status) ? 1 : 0) -
              (["valid", "no_expiry"].includes(editingCert.validity_status) ? 1 : 0),
            expiring_soon:
              (Number(prev.expiring_soon) || 0) +
              (updated.validity_status === "expiring_soon" ? 1 : 0) -
              (editingCert.validity_status === "expiring_soon" ? 1 : 0),
            expired:
              (Number(prev.expired) || 0) +
              (updated.validity_status === "expired" ? 1 : 0) -
              (editingCert.validity_status === "expired" ? 1 : 0),
            batch_attached:
              (Number(prev.batch_attached) || 0) +
              (updated.batch_id ? 1 : 0) -
              (editingCert.batch_id ? 1 : 0),
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

  // Xác nhận xóa chứng nhận
  const handleConfirmDelete = async () => {
    if (!deletingCert) return;
    setDeleteSubmitting(true);
    try {
      await farmApi.deleteCertificate(deletingCert.id);
      showToast("Đã xóa chứng nhận thành công.");
      const deletedId = deletingCert.id;
      setCertificates((prev) => prev.filter((c) => String(c.id) !== String(deletedId)));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, (Number(prev.total) || 0) - 1),
        valid: Math.max(
          0,
          (Number(prev.valid) || 0) -
            (["valid", "no_expiry"].includes(deletingCert.validity_status) ? 1 : 0)
        ),
        expiring_soon: Math.max(
          0,
          (Number(prev.expiring_soon) || 0) -
            (deletingCert.validity_status === "expiring_soon" ? 1 : 0)
        ),
        expired: Math.max(
          0,
          (Number(prev.expired) || 0) -
            (deletingCert.validity_status === "expired" ? 1 : 0)
        ),
        batch_attached: Math.max(
          0,
          (Number(prev.batch_attached) || 0) - (deletingCert.batch_id ? 1 : 0)
        ),
      }));
      setDeletingCert(null);
      if (previewCert && String(previewCert.id) === String(deletedId)) {
        setPreviewCert(null);
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể xóa hồ sơ chứng nhận.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Lọc danh sách chứng nhận theo từ khóa và trạng thái
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

  // Huy hiệu trạng thái hiệu lực
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

  // =========================================================================
  // 6. GIAO DIỆN (UI RENDER)
  // =========================================================================
  return (
    <div className="space-y-6 pb-12">
      {/* 6.1 Top Banner Tiêu Chuẩn Phân Hệ Nông Trại */}
      <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border border-emerald-900/10 bg-gradient-to-br from-white via-[#fcfdfa] to-emerald-50/30 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-300/60">
                Phân Hệ Nông Trại
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-emerald-800">
                Chứng nhận chất lượng & Hồ sơ kiểm định
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-700" />
              <span>Chứng Nhận & Kiểm Định</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchCertificates(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer shadow-2xs"
              title="Làm mới danh sách"
              aria-label="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => openCreateModal("")}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tải Chứng Nhận</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6.2 Thẻ thống kê chỉ số KPI chứng nhận */}
      <CertificateStatCards stats={stats} />

      {/* 6.3 Bảng danh sách chứng nhận & bộ lọc */}
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

      {/* 6.4 Hộp thoại: Thêm & Chỉnh sửa chứng nhận */}
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

      {/* 6.5 Hộp thoại: Xem trước tài liệu / kết quả kiểm định */}
      <CertificatePreviewModal
        previewCert={previewCert}
        setPreviewCert={setPreviewCert}
        openEditModal={openEditModal}
      />

      {/* 6.6 Hộp thoại: Xác nhận xóa chứng nhận */}
      <CertificateDeleteModal
        deletingCert={deletingCert}
        setDeletingCert={setDeletingCert}
        deleteSubmitting={deleteSubmitting}
        handleConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
