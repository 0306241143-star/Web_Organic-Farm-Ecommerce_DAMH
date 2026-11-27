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
  Search,
  X,
} from "lucide-react";
import { farmApi } from "../../services/farmApi";
import { showGlobalToast } from "../../components/GlobalToast";
import Pagination from "../../components/common/Pagination";
import CertificateTable from "../../components/farm/certificates/CertificateTable";
import CertificateFormModal from "../../components/farm/certificates/CertificateFormModal";
import CertificatePreviewModal from "../../components/farm/certificates/CertificatePreviewModal";
import CertificateDeleteModal from "../../components/farm/certificates/CertificateDeleteModal";
import {
  isApiValidationError,
  notifyApiErrorToast,
} from "../../services/axiosClient";

const PER_PAGE = 10;

export default function CertificateManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // =========================================================================
  // 1. STATE QUẢN LÝ DỮ LIỆU CHỨNG NHẬN
  // =========================================================================
  const [certificates, setCertificates] = useState([]);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =========================================================================
  // 2. STATE BỘ LỌC TÌM KIẾM & PHÂN TRANG (TỨC THÌ 0MS)
  // =========================================================================
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  // =========================================================================
  // 3. STATE HỘP THOẠI (MODALS)
  // =========================================================================
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [initialFormValues, setInitialFormValues] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [previewCert, setPreviewCert] = useState(null);
  const [deletingCert, setDeletingCert] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // =========================================================================
  // 4. API HANDLERS & TẢI DỮ LIỆU
  // =========================================================================
  const showToast = useCallback((msg, type = "success") => {
    showGlobalToast(msg, type);
  }, []);

  // Tải lại danh sách chứng nhận; chế độ im lặng giữ bộ lọc và phân trang hiện tại.
  const fetchCertificates = useCallback(async (isSilent = false) => {
    const startedAt = Date.now();
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await farmApi.getCertificates();
      const payload = res.data?.data ?? res.data ?? res ?? {};
      setCertificates(Array.isArray(payload.certificates) ? payload.certificates : []);

      if (isSilent) {
        const elapsed = Date.now() - startedAt;
        if (elapsed < 350) {
          await new Promise((r) => setTimeout(r, 350 - elapsed));
        }
        showGlobalToast("Đã cập nhật danh sách chứng nhận mới nhất!");
      }
    } catch (err) {
      notifyApiErrorToast(err, "Không thể tải danh sách chứng nhận. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
  const openCreateModal = (defaultBatchId = "") => {
    setEditingCert(null);
    setInitialFormValues(
      defaultBatchId ? { batch_id: String(defaultBatchId) } : null
    );
    setIsFormOpen(true);
  };

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

  const handleSubmitForm = async ({ attachMode, formState, selectedFile }) => {
    setSubmitting(true);
    try {
      const payload = new FormData();
      if (attachMode === "batch" && formState.Ma_lo_hang) {
        payload.append("Ma_lo_hang", formState.Ma_lo_hang);
        if (formState.Ma_san_pham) {
          payload.append("Ma_san_pham", formState.Ma_san_pham);
        }
      } else if (attachMode === "product" && formState.Ma_san_pham) {
        payload.append("Ma_san_pham", formState.Ma_san_pham);
      }

      payload.append("Ten_chung_nhan", formState.Ten_chung_nhan.trim());
      payload.append("To_chuc_cap", formState.To_chuc_cap.trim());
      payload.append("Ngay_cap", formState.Ngay_cap);
      if (formState.Ngay_het_han) {
        payload.append("Ngay_het_han", formState.Ngay_het_han);
      }
      if (selectedFile) {
        payload.append("file", selectedFile);
      }

      if (editingCert) {
        const res = await farmApi.updateCertificate(editingCert.id, payload);
        const updated = res.data?.data ?? res.data;
        if (updated?.id != null) {
          setCertificates((prev) =>
            prev.map((c) =>
              String(c.id) === String(updated.id) ? { ...c, ...updated } : c
            )
          );
        }
        showToast("Đã cập nhật hồ sơ chứng nhận thành công.");
      } else {
        const res = await farmApi.uploadCertificate(payload);
        const createdCert = res.data?.data ?? res.data;
        if (createdCert?.id != null) {
          setCertificates((prev) => [
            createdCert,
            ...prev.filter((cert) => String(cert.id) !== String(createdCert.id)),
          ]);
          setPage(1);
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
      showToast("Đã xóa chứng nhận thành công.");
      const deletedId = deletingCert.id;
      setCertificates((prev) => prev.filter((c) => String(c.id) !== String(deletedId)));
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

  // Đếm số lượng trực tiếp trên các tab lọc
  const tabCounts = useMemo(() => {
    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;

    certificates.forEach((item) => {
      if (["valid", "no_expiry"].includes(item.validity_status)) valid += 1;
      else if (item.validity_status === "expiring_soon") expiringSoon += 1;
      else if (item.validity_status === "expired") expired += 1;
    });

    return {
      all: certificates.length,
      valid,
      expiring_soon: expiringSoon,
      expired,
    };
  }, [certificates]);

  // Lọc danh sách chứng nhận tức thì
  const filteredCertificates = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return certificates.filter((item) => {
      if (
        statusFilter === "valid" &&
        !["valid", "no_expiry"].includes(item.validity_status)
      ) {
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

      if (q) {
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

  // Phân trang 10 chứng nhận / trang
  const paginationMeta = useMemo(() => {
    const total = filteredCertificates.length;
    const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));
    const safePage = Math.min(page, lastPage);
    return {
      current_page: safePage,
      last_page: lastPage,
      per_page: PER_PAGE,
      total,
    };
  }, [filteredCertificates.length, page]);

  const paginatedCertificates = useMemo(() => {
    const start = (paginationMeta.current_page - 1) * PER_PAGE;
    return filteredCertificates.slice(start, start + PER_PAGE);
  }, [filteredCertificates, paginationMeta.current_page]);

  const renderValidityBadge = (cert) => {
    if (cert.validity_status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap shrink-0">
          <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>Đã hết hạn</span>
        </span>
      );
    }
    if (cert.validity_status === "expiring_soon") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>Còn {cert.days_remaining} ngày</span>
        </span>
      );
    }
    if (cert.validity_status === "no_expiry") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap shrink-0">
          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
          <span>Theo đợt kiểm định</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10.5px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
        <span>Còn hiệu lực</span>
      </span>
    );
  };

  const filterTabs = [
    { id: "ALL", label: "Tất cả", count: tabCounts.all },
    { id: "valid", label: "Còn hiệu lực", count: tabCounts.valid },
    { id: "expiring_soon", label: "Sắp hết hạn", count: tabCounts.expiring_soon },
    { id: "expired", label: "Hết hạn", count: tabCounts.expired },
  ];

  // =========================================================================
  // 6. GIAO DIỆN ĐỒNG BỘ BỐ CỤC GỐC — TỐI ƯU MOBILE-FIRST
  // =========================================================================
  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mb-3.5 sm:-mb-6 lg:-mb-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* 6.1 KHỐI HEADER CỐ ĐỊNH SÁT MÉP TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2.5 pb-2 sm:pt-3 sm:pb-2.5 space-y-2 sm:space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút làm mới & Tải Chứng Nhận */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                <span>Phân Hệ Nông Trại</span>
                <span className="text-slate-300">•</span>
                <span className="normal-case font-semibold text-emerald-800">
                  Chứng nhận chất lượng &amp; Hồ sơ kiểm định
                </span>
              </div>
              <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 sm:mt-0.5 truncate">
                <Award className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                <span className="truncate">Chứng Nhận &amp; Kiểm Định</span>
              </h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fetchCertificates(true)}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer"
                title="Làm mới danh sách"
                aria-label="Làm mới danh sách"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-600" : ""}`}
                />
              </button>

              <button
                type="button"
                onClick={() => openCreateModal("")}
                className="px-3 py-2 sm:px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Tải Chứng Nhận</span>
              </button>
            </div>
          </div>

          {/* Hàng 2: Tabs lọc hiệu lực, phạm vi & Ô tìm kiếm (lướt ngang gọn trên Mobile) */}
          <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0 no-scrollbar">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 sm:px-3 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    statusFilter === tab.id
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                      statusFilter === tab.id
                        ? "bg-white/25 text-white"
                        : "bg-white text-slate-600 border border-slate-200/80"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}

              <span className="text-slate-300 px-0.5 shrink-0">|</span>

              <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-full border border-slate-200 shrink-0">
                {[
                  { id: "ALL", label: "Mọi phạm vi" },
                  { id: "batch", label: "Gắn lô hàng" },
                  { id: "product", label: "Theo sản phẩm" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setScopeFilter(s.id);
                      setPage(1);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      scopeFilter === s.id
                        ? "bg-white text-emerald-800 font-bold shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm tên chứng nhận, đơn vị, mã lô..."
                className="w-full pl-8 pr-8 py-1.5 sm:py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6.2 VÙNG NỘI DUNG CUỘN ĐỘC LẬP BÊN DƯỚI */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
          <CertificateTable
            loading={loading}
            filteredCertificates={paginatedCertificates}
            totalFilteredCount={filteredCertificates.length}
            certificates={certificates}
            openCreateModal={openCreateModal}
            renderValidityBadge={renderValidityBadge}
            setPreviewCert={setPreviewCert}
            openEditModal={openEditModal}
            setDeletingCert={setDeletingCert}
          />

          <Pagination
            currentPage={paginationMeta.current_page}
            lastPage={paginationMeta.last_page}
            total={paginationMeta.total}
            perPage={paginationMeta.per_page}
            onPageChange={(nextPage) => setPage(nextPage)}
            itemLabel="hồ sơ chứng nhận"
          />
        </div>
      </div>

      {/* 6.3 Hộp thoại: Thêm & Chỉnh sửa chứng nhận */}
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

      {/* 6.4 Hộp thoại: Xem trước tài liệu / kết quả kiểm định */}
      <CertificatePreviewModal
        previewCert={previewCert}
        setPreviewCert={setPreviewCert}
        openEditModal={openEditModal}
      />

      {/* 6.5 Hộp thoại: Xác nhận xóa chứng nhận */}
      <CertificateDeleteModal
        deletingCert={deletingCert}
        setDeletingCert={setDeletingCert}
        deleteSubmitting={deleteSubmitting}
        handleConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}