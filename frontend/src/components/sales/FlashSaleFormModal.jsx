import { useEffect, useState } from "react";
import { Flame, Plus, Sparkles, Trash2, X } from "lucide-react";

const toLocalInput = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const computeDefaultEndTime = (batch) => {
  const now = new Date();
  const defaultEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  if (batch?.expiry_date) {
    const expiryEnd = new Date(`${batch.expiry_date}T23:59:00`);
    if (
      !Number.isNaN(expiryEnd.getTime()) &&
      expiryEnd > now &&
      expiryEnd < defaultEnd
    ) {
      return toLocalInput(expiryEnd);
    }
  }
  return toLocalInput(defaultEnd);
};

const suggestSalePrice = (batch) => {
  const reg = Number(batch?.regular_price || 0);
  if (reg <= 1000) return "";
  return String(Math.max(1000, Math.round((reg * 0.7) / 1000) * 1000));
};

const newItem = () => ({ batch_id: "", sale_price: "", limit_quantity: "" });

export default function FlashSaleFormModal({
  isOpen,
  onClose,
  batches = [],
  initialBatch = null,
  loadingBatches = false,
  saving = false,
  error = "",
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(() => toLocalInput(new Date()));
  const [endTime, setEndTime] = useState(() => computeDefaultEndTime(null));
  const [batchSearch, setBatchSearch] = useState("");
  const [items, setItems] = useState([newItem()]);

  // Khởi tạo / điền sẵn dữ liệu mỗi khi mở Modal (đặc biệt khi bấm "Xả hàng" từ trang FEFO)
  useEffect(() => {
    if (!isOpen) return;

    setStartTime(toLocalInput(new Date()));
    setEndTime(computeDefaultEndTime(initialBatch));
    setBatchSearch("");

    if (initialBatch) {
      setTitle(
        `Xả kho cận hạn - ${initialBatch.product_name} (#LH-${String(initialBatch.batch_id).padStart(4, "0")})`
      );
      setItems([
        {
          batch_id: String(initialBatch.batch_id),
          sale_price: suggestSalePrice(initialBatch),
          limit_quantity: String(initialBatch.remaining_quantity ?? ""),
        },
      ]);
    } else {
      setTitle("");
      setItems([newItem()]);
    }
  }, [isOpen, initialBatch]);

  // Đóng nhanh bằng phím Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

const eligibleBatches = batches.filter(
    (batch) =>
      !batch.has_active_flash_sale &&
      batch.remaining_quantity > 0 &&
      batch.days_until_expiry >= 0 &&
      batch.days_until_expiry <= 2 &&
      ["Con_hang", "Sap_het_han"].includes(batch.status)
  );

  const visibleBatches = eligibleBatches.filter((batch) => {
    const kw = batchSearch.trim().toLowerCase();
    if (!kw) return true;
    return (
      String(batch.batch_id).includes(kw) ||
      String(batch.product_name || "").toLowerCase().includes(kw)
    );
  });

  const updateItem = (index, key, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  const selectBatch = (index, batchId) => {
    const batch = eligibleBatches.find(
      (item) => String(item.batch_id) === batchId
    );
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              batch_id: batchId,
              sale_price: batch ? suggestSalePrice(batch) : "",
              limit_quantity: batch ? String(batch.remaining_quantity) : "",
            }
          : item
      )
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      title: title.trim(),
      start_time: startTime,
      end_time: endTime,
      items: items.map((item) => ({
        batch_id: Number(item.batch_id),
        sale_price: Number(item.sale_price),
        limit_quantity: Number(item.limit_quantity),
      })),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="flash-sale-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/55 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-3xl max-h-[92dvh] sm:max-h-[92vh] bg-white rounded-t-3xl rounded-b-none sm:rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50/70 via-white to-amber-50/50 flex items-start sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/15 text-amber-700 border border-amber-300/70 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="flash-sale-modal-title"
                className="text-sm sm:text-lg font-black text-slate-900 leading-snug sm:truncate"
              >
                Tạo Chương Trình Flash Sale Cận Hạn
              </h2>
              <p className="text-[11px] sm:text-[11.5px] text-slate-500 leading-snug sm:truncate">
                Chỉ áp dụng cho lô còn tồn kho sắp hết hạn trong 2 ngày tới; giá giảm thấp hơn giá gốc.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Đóng hộp thoại"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body cuộn nội bộ */}
        <form
          id="flash-sale-modal-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3.5 sm:space-y-4 scrollbar-thin"
        >
          {initialBatch && (
            <div className="flex items-start sm:items-center gap-2 rounded-xl border border-amber-300/80 bg-amber-50 px-3 sm:px-3.5 py-2 text-xs font-bold text-amber-900">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Đã tự động điền thông tin từ lô #LH-
                {String(initialBatch.batch_id).padStart(4, "0")} ·{" "}
                {initialBatch.product_name} (Còn {initialBatch.remaining_quantity}{" "}
                {initialBatch.unit || ""})
              </span>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
            >
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold text-slate-700 sm:col-span-3">
              Tên chương trình *
              <input
                required
                maxLength={150}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3.5 py-2 text-sm font-medium text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Ví dụ: Xả kho rau hữu cơ cuối ngày"
              />
            </label>

            <label className="grid gap-1 text-xs font-bold text-slate-700 min-w-0">
              Thời gian bắt đầu *
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:border-emerald-600"
              />
            </label>

            <label className="grid gap-1 text-xs font-bold text-slate-700 sm:col-span-2 min-w-0">
              Thời gian kết thúc (không vượt quá HSD của lô) *
              <input
                required
                type="datetime-local"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 outline-none focus:border-emerald-600"
              />
            </label>
          </div>

          {/* Lọc nhanh lô cận hạn trong dropdown */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <span className="text-xs font-extrabold text-slate-800">
              Danh sách lô hàng áp dụng ({items.length} lô)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                placeholder="Lọc nhanh lô cận hạn..."
                className="w-full min-w-0 sm:w-52 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-emerald-600"
              />
              <span className="text-[11px] font-semibold text-emerald-700 whitespace-nowrap shrink-0">
                {loadingBatches && eligibleBatches.length === 0
                  ? "Đang tải..."
                  : `${eligibleBatches.length} lô đủ điều kiện`}
              </span>
            </div>
          </div>

          {/* Từng dòng lô hàng giảm giá */}
          <div className="space-y-2.5">
            {items.map((item, index) => {
              const selectedBatch = eligibleBatches.find(
                (batch) => String(batch.batch_id) === item.batch_id
              );
              const regularPrice = Number(selectedBatch?.regular_price || 0);
              const dropdownBatches =
                selectedBatch &&
                !visibleBatches.some(
                  (b) => String(b.batch_id) === String(selectedBatch.batch_id)
                )
                  ? [selectedBatch, ...visibleBatches]
                  : visibleBatches;

              return (
                <div
                  key={`flash-sale-item-${index}`}
                  className="grid gap-3 rounded-2xl border border-slate-200/80 bg-[#f8faf8] p-3 sm:p-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <label className="grid gap-1 text-xs font-bold text-slate-700 sm:col-span-3 min-w-0">
                    Lô hàng cận hạn *
                    <select
                      required
                      value={item.batch_id}
                      onChange={(event) => selectBatch(index, event.target.value)}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="">-- Chọn lô cận hạn còn tồn kho --</option>
                      {dropdownBatches.map((batch) => (
                        <option
                          key={batch.batch_id}
                          value={batch.batch_id}
                          disabled={items.some(
                            (other, otherIndex) =>
                              otherIndex !== index &&
                              String(other.batch_id) === String(batch.batch_id)
                          )}
                        >
                          #LH-{String(batch.batch_id).padStart(4, "0")} ·{" "}
                          {batch.product_name}
                          {Number(batch.regular_price) > 0
                            ? ` (Gốc: ${Number(batch.regular_price).toLocaleString("vi-VN")}₫)`
                            : ""}
                          {" · "}Còn {batch.remaining_quantity} {batch.unit} · HSD{" "}
                          {batch.expiry_date}
                        </option>
                      ))}
                    </select>
                    {selectedBatch && (
                      <span className="sm:hidden text-[11px] font-medium text-slate-600">
                        Tồn kho: <strong>{selectedBatch.remaining_quantity} {selectedBatch.unit}</strong> · HSD: <strong>{selectedBatch.expiry_date}</strong>
                      </span>
                    )}
                  </label>

                  <label className="grid gap-1 text-xs font-bold text-slate-700 min-w-0">
                    <span>
                      Giá khuyến mãi (₫) *
                      {regularPrice > 0 && (
                        <span className="ml-1 font-semibold text-emerald-700">
                          (Gốc: {regularPrice.toLocaleString("vi-VN")}₫)
                        </span>
                      )}
                    </span>
                    <input
                      required
                      type="number"
                      min="1"
                      max={regularPrice > 1 ? regularPrice - 1 : undefined}
                      step="1"
                      placeholder="Nhập giá giảm"
                      value={item.sale_price}
                      onChange={(event) =>
                        updateItem(index, "sale_price", event.target.value)
                      }
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-emerald-800 outline-none focus:border-emerald-600"
                    />
                  </label>

                  <label className="grid gap-1 text-xs font-bold text-slate-700 min-w-0">
                    <span>
                      Số lượng mở bán {selectedBatch?.unit ? `(${selectedBatch.unit})` : ""} *
                      {selectedBatch && (
                        <span className="ml-1 font-normal text-slate-500">
                          / Tối đa {selectedBatch.remaining_quantity}
                        </span>
                      )}
                    </span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      max={selectedBatch?.remaining_quantity || undefined}
                      step="0.01"
                      value={item.limit_quantity}
                      onChange={(event) =>
                        updateItem(index, "limit_quantity", event.target.value)
                      }
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((current) =>
                          current.length > 1
                            ? current.filter((_, itemIndex) => itemIndex !== index)
                            : current
                        )
                      }
                      disabled={items.length === 1}
                      title="Xóa dòng lô hàng này"
                      aria-label={`Xóa dòng sản phẩm ${index + 1}`}
                      className="inline-flex h-10 w-full sm:w-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer text-xs font-bold"
                    >
                      <Trash2 className="h-4 w-4 shrink-0" />
                      <span className="sm:hidden">Xóa lô hàng này</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setItems((current) => [...current, newItem()])}
            disabled={items.length >= 30 || eligibleBatches.length <= items.length}
            className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 px-3.5 py-2 text-xs font-bold text-[#064e2e] disabled:opacity-50 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Thêm lô cận hạn khác vào chiến dịch</span>
          </button>
        </form>

        {/* Footer Modal */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="flash-sale-modal-form"
            disabled={
              saving ||
              (loadingBatches && eligibleBatches.length === 0) ||
              eligibleBatches.length === 0
            }
            className="flex-1 sm:flex-initial justify-center px-4 sm:px-5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Flame className="w-4 h-4 shrink-0" />
            <span>{saving ? "Đang khởi tạo..." : "Tạo & Bật Flash Sale"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}