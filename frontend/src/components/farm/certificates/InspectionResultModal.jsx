import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, FileText, PackageCheck, Search, Sprout, Upload, X } from "lucide-react";

// Custom dropdown khóa cứng chiều rộng 100% — chọn Lô hàng thu hoạch
function BatchSelectDropdown({ batches = [], value, onChange, labelId, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const selectedBatch = batches.find((b) => String(b.id) === String(value));
  const filtered = query.trim()
    ? batches.filter((b) => {
        const q = query.trim().toLowerCase();
        return (
          (b.batch_code || "").toLowerCase().includes(q) ||
          (b.product_name || "").toLowerCase().includes(q) ||
          (b.plot_name || "").toLowerCase().includes(q) ||
          String(b.id).includes(q)
        );
      })
    : batches;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className={`w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
            : error
              ? "border-red-300 bg-red-50/30"
              : "border-slate-200 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedBatch ? (
            <>
              <PackageCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">
                {selectedBatch.batch_code} · {selectedBatch.product_name}
              </span>
            </>
          ) : (
            <span className="text-slate-500 truncate">
              Chọn lô hàng thu hoạch cần gắn chứng nhận
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full mt-1.5 z-40 w-full max-w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {batches.length > 5 && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm mã lô, nông sản hoặc lô đất..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto overflow-x-hidden p-1.5 space-y-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-xs text-slate-500">
                Không tìm thấy lô hàng thu hoạch phù hợp.
              </div>
            ) : (
              filtered.map((batch) => {
                const isSelected = String(value) === String(batch.id);
                return (
                  <button
                    key={batch.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(batch);
                      setIsOpen(false);
                    }}
                    className={`w-full min-w-0 text-left px-3 py-2.5 rounded-xl flex items-start justify-between gap-2.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/80"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-[13px] font-bold text-slate-800 break-words leading-snug">
                          {batch.product_name}
                        </div>
                        <div className="text-[11px] text-slate-500 break-words leading-snug mt-0.5 tabular-nums">
                          {batch.batch_code} · Thu {batch.harvest_date} · {batch.plot_name}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom dropdown khóa cứng chiều rộng 100% — chọn Sản phẩm (khi gắn theo sản phẩm chung)
function ProductSelectDropdown({ products = [], value, onChange, labelId, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  const selectedProd = products.find((p) => String(p.id) === String(value));
  const filtered = query.trim()
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(query.trim().toLowerCase())
      )
    : products;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className={`w-full min-w-0 px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-left flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
          isOpen
            ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
            : error
              ? "border-red-300 bg-red-50/30"
              : "border-slate-200 hover:border-slate-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedProd ? (
            <>
              <Sprout className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">
                {selectedProd.name}
              </span>
            </>
          ) : (
            <span className="text-slate-500 truncate">
              Chọn sản phẩm nông sản áp dụng
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-emerald-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-labelledby={labelId}
          className="absolute left-0 right-0 top-full mt-1.5 z-40 w-full max-w-full bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {products.length > 5 && (
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên nông sản..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div className="max-h-52 overflow-y-auto overflow-x-hidden p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                Không tìm thấy sản phẩm phù hợp.
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = String(value) === String(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(String(p.id));
                      setIsOpen(false);
                    }}
                    className={`w-full min-w-0 text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-950 font-semibold"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs sm:text-[13px] break-words min-w-0 flex-1 leading-snug">
                      {p.name}
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.unit}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InspectionResultModal({
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
  editingCert
}) {
  return (
            <form
              id="certificate-upload-form"
              onSubmit={handleSubmitForm}
              className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-5 sm:p-6 space-y-4"
            >
              {/* Phạm vi gắn chứng nhận */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phạm Vi Áp Dụng <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setAttachMode("batch")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      attachMode === "batch"
                        ? "bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Gắn vào Lô hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachMode("product");
                      setFormState((prev) => ({ ...prev, Ma_lo_hang: "" }));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      attachMode === "product"
                        ? "bg-white text-emerald-800 shadow-xs ring-1 ring-emerald-200"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <Sprout className="w-3.5 h-3.5 shrink-0" />
                    <span>Theo Sản phẩm</span>
                  </button>
                </div>
              </div>

              {/* Chọn Lô hàng hoặc Sản phẩm (Custom Dropdown khóa chiều rộng 100%) */}
              {attachMode === "batch" ? (
                <div>
                  <label
                    id="cert-batch-label"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Lô Hàng Thu Hoạch <span className="text-red-500">*</span>
                  </label>
                  <BatchSelectDropdown
                    batches={batches}
                    value={formState.Ma_lo_hang}
                    labelId="cert-batch-label"
                    error={fieldErrors.Ma_lo_hang}
                    onChange={(batch) => {
                      setFormState((prev) => ({
                        ...prev,
                        Ma_lo_hang: String(batch.id),
                        Ma_san_pham: batch.product_id ? String(batch.product_id) : "",
                      }));
                      setFieldErrors((prev) => ({ ...prev, Ma_lo_hang: undefined }));
                    }}
                  />
                  {fieldErrors.Ma_lo_hang && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">
                      {fieldErrors.Ma_lo_hang}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label
                    id="cert-product-label"
                    className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Sản Phẩm Nông Sản <span className="text-red-500">*</span>
                  </label>
                  <ProductSelectDropdown
                    products={products}
                    value={formState.Ma_san_pham}
                    labelId="cert-product-label"
                    error={fieldErrors.Ma_san_pham}
                    onChange={(prodId) => {
                      setFormState((prev) => ({ ...prev, Ma_san_pham: prodId }));
                      setFieldErrors((prev) => ({ ...prev, Ma_san_pham: undefined }));
                    }}
                  />
                  {fieldErrors.Ma_san_pham && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">
                      {fieldErrors.Ma_san_pham}
                    </p>
                  )}
                </div>
              )}

              {/* Gợi ý mẫu chứng nhận nhanh */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Tên Chứng Nhận / Phiếu Kiểm Định <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={formState.Ten_chung_nhan}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, Ten_chung_nhan: e.target.value }))
                  }
                  placeholder="Ví dụ: Chứng nhận VietGAP Trồng trọt hoặc Phiếu kiểm nghiệm mẫu đất/nước"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                {fieldErrors.Ten_chung_nhan && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">
                    {fieldErrors.Ten_chung_nhan}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {CERT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          Ten_chung_nhan: preset.name,
                          To_chuc_cap: preset.issuer,
                        }))
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tổ chức cấp */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Tổ Chức Cấp / Đơn Vị Kiểm Định <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.To_chuc_cap}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, To_chuc_cap: e.target.value }))
                  }
                  placeholder="Ví dụ: QUACERT, QUATEST 3, Viện Nghiên cứu Rau quả..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                {fieldErrors.To_chuc_cap && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">
                    {fieldErrors.To_chuc_cap}
                  </p>
                )}
              </div>

              {/* Ngày cấp & Ngày hết hạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="min-w-0">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between gap-2">
                    <span>
                      Ngày Cấp <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal normal-case">
                      Tối đa: Hôm nay
                    </span>
                  </label>
                  <input
                    type="date"
                    max={getTodayLocal()}
                    value={formState.Ngay_cap}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, Ngay_cap: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  {fieldErrors.Ngay_cap && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">
                      {fieldErrors.Ngay_cap}
                    </p>
                  )}
                </div>

                <div className="min-w-0">
                  <label className="text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between gap-2">
                    <span>Ngày Hết Hạn</span>
                    <span className="text-[10px] text-slate-400 font-normal normal-case">
                      Để trống nếu theo đợt
                    </span>
                  </label>
                  <input
                    type="date"
                    min={formState.Ngay_cap || undefined}
                    value={formState.Ngay_het_han}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, Ngay_het_han: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                  {fieldErrors.Ngay_het_han && (
                    <p className="text-red-600 text-[11px] mt-1 font-medium">
                      {fieldErrors.Ngay_het_han}
                    </p>
                  )}
                </div>
              </div>

              {/* Gợi ý nhanh thời hạn */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                <span className="text-[11px] font-bold text-slate-500 px-1">Thời hạn:</span>
                {[
                  { label: "+6 tháng", months: 6 },
                  { label: "+1 năm", months: 12 },
                  { label: "+2 năm", months: 24 },
                ].map((opt) => {
                  const target = addMonthsLocal(formState.Ngay_cap || getTodayLocal(), opt.months);
                  const active = formState.Ngay_het_han === target;
                  return (
                    <button
                      key={opt.months}
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, Ngay_het_han: target }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                        active
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setFormState((prev) => ({ ...prev, Ngay_het_han: "" }))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                    !formState.Ngay_het_han
                      ? "bg-slate-700 text-white border-slate-700"
                      : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  Không giới hạn
                </button>
              </div>

              {/* Khu vực tải lên tệp PDF / Bản scan hình ảnh */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Bản Scan Chứng Nhận / Kết Quả Kiểm Định{" "}
                  {!editingCert && <span className="text-red-500">*</span>}
                </label>

                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleChooseFile(file);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-emerald-500 bg-emerald-50/70"
                      : fieldErrors.file
                        ? "border-red-300 bg-red-50/30"
                        : "border-slate-300 bg-slate-50/60 hover:border-emerald-500 hover:bg-emerald-50/25"
                  }`}
                >
                  <Upload className="w-6 h-6 text-emerald-600 mb-1.5" />
                  <span className="text-xs font-bold text-emerald-800">
                    {selectedFile
                      ? "Chọn tệp khác để thay thế"
                      : editingCert
                        ? "Tải bản scan mới (để trống nếu giữ nguyên tệp cũ)"
                        : "Bấm chọn hoặc kéo thả tệp vào đây"}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    Hỗ trợ PDF, JPG, PNG, WEBP · Dung lượng tối đa 10MB
                  </span>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleChooseFile(file);
                      e.target.value = "";
                    }}
                    className="hidden"
                  />
                </label>

                {selectedFile && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Xem trước bản scan"
                          className="w-12 h-12 rounded-xl object-cover border border-emerald-200 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetFileSelection}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                      title="Bỏ chọn tệp"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {!selectedFile && editingCert && (
                  <p className="text-[11px] text-slate-500 mt-1.5 truncate">
                    Tệp hiện tại: <strong className="text-slate-700">{editingCert.file_name}</strong>
                  </p>
                )}

                {fieldErrors.file && (
                  <p className="text-red-600 text-[11px] mt-1 font-medium">{fieldErrors.file}</p>
                )}
              </div>
            </form>
  );
}
