import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const toLocalInput = (date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const newItem = () => ({ batch_id: "", sale_price: "", limit_quantity: "" });

export default function FlashSaleForm({
  batches,
  batchSearch,
  onBatchSearchChange,
  loadingBatches,
  saving,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState(() => toLocalInput(new Date()));
  const [endTime, setEndTime] = useState(() =>
    toLocalInput(new Date(Date.now() + 60 * 60 * 1000))
  );
  const [items, setItems] = useState([newItem()]);

  // Cập nhật từng dòng sản phẩm độc lập để không làm mất dữ liệu của các lô khác.
  const updateItem = (index, key, value) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    );
  };

  // Khi đổi lô, đặt giới hạn mở bán mặc định theo tồn kho còn lại của lô đó.
  const selectBatch = (index, batchId) => {
    const batch = batches.find((item) => String(item.batch_id) === batchId);
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              batch_id: batchId,
              limit_quantity: batch ? String(batch.remaining_quantity) : "",
            }
          : item
      )
    );
  };

  // Chuyển dữ liệu form sang payload số trước khi gửi tạo chương trình Flash Sale.
  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      title,
      start_time: startTime,
      end_time: endTime,
      items: items.map((item) => ({
        batch_id: Number(item.batch_id),
        sale_price: Number(item.sale_price),
        limit_quantity: Number(item.limit_quantity),
      })),
    });
  };

  // Chỉ cho phép chọn lô còn hàng, chưa quá hạn và còn tối đa hai ngày hữu dụng.
  const eligibleBatches = batches.filter(
    (batch) =>
      batch.remaining_quantity > 0 &&
      batch.days_until_expiry >= 0 &&
      batch.days_until_expiry <= 2 &&
      ["Con_hang", "Sap_het_han"].includes(batch.status)
  );

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[#c0c9bb]/40 bg-white p-4 sm:p-5"
    >
      <div>
        <h2 className="text-lg font-bold text-[#00450d]">Tạo Flash Sale</h2>
        <p className="mt-1 text-xs text-[#5a6357]">
          Mỗi chương trình giới hạn số lượng theo lô hàng; giá khuyến mãi phải thấp hơn giá bán hiện tại.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs font-bold text-[#5a6357] sm:col-span-3">
          Tên chương trình
          <input
            required
            maxLength={150}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
            placeholder="Ví dụ: Rau sạch cuối ngày"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
          Bắt đầu
          <input
            required
            type="datetime-local"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
            className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-bold text-[#5a6357] sm:col-span-2">
          Kết thúc
          <input
            required
            type="datetime-local"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
            className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid flex-1 gap-1.5 text-xs font-bold text-[#5a6357]">
          Tìm lô hàng
          <input
            type="search"
            value={batchSearch}
            onChange={(event) => onBatchSearchChange(event.target.value)}
            placeholder="Nhập mã lô hoặc tên nông sản"
            className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
          />
        </label>
        <span className="pb-2 text-xs text-[#5a6357]">
          {loadingBatches ? "Đang tìm lô..." : `${eligibleBatches.length} lô khả dụng`}
        </span>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const selectedBatch = eligibleBatches.find(
            (batch) => String(batch.batch_id) === item.batch_id
          );
          return (
            <div
              key={`flash-sale-item-${index}`}
              className="grid gap-3 rounded-xl border border-[#c0c9bb]/30 bg-[#f8faf8] p-3 sm:grid-cols-[minmax(0,1.5fr)_1fr_1fr_auto]"
            >
              <label className="grid gap-1.5 text-xs font-bold text-[#5a6357] sm:col-span-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                Lô hàng
                <select
                  required
                  value={item.batch_id}
                  onChange={(event) => selectBatch(index, event.target.value)}
                  className="rounded-xl border border-[#c0c9bb]/60 bg-white px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
                >
                  <option value="">Chọn lô cận hạn, còn tồn</option>
                  {eligibleBatches.map((batch) => (
                    <option
                      key={batch.batch_id}
                      value={batch.batch_id}
                      disabled={items.some(
                        (other, otherIndex) =>
                          otherIndex !== index &&
                          String(other.batch_id) === String(batch.batch_id)
                      )}
                    >
                      #{batch.batch_id} · {batch.product_name} · còn {batch.remaining_quantity} {batch.unit} · HSD {batch.expiry_date}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
                Giá khuyến mãi (₫)
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={item.sale_price}
                  onChange={(event) => updateItem(index, "sale_price", event.target.value)}
                  className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-[#5a6357]">
                Giới hạn số lượng {selectedBatch?.unit || ""}
                <input
                  required
                  type="number"
                  min="0.01"
                  max={selectedBatch?.remaining_quantity || undefined}
                  step="0.01"
                  value={item.limit_quantity}
                  onChange={(event) => updateItem(index, "limit_quantity", event.target.value)}
                  className="rounded-xl border border-[#c0c9bb]/60 px-3 py-2.5 text-sm font-normal text-[#191c1b] outline-none focus:border-[#006e1c]"
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  setItems((current) =>
                    current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current
                  )
                }
                disabled={items.length === 1}
                aria-label={`Xóa dòng sản phẩm ${index + 1}`}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => setItems((current) => [...current, newItem()])}
          disabled={items.length >= 30}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#c0c9bb]/60 px-3 py-2 text-sm font-bold text-[#00450d] hover:bg-[#f2f4f2] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Thêm lô hàng
        </button>
        <button
          type="submit"
          disabled={saving || loadingBatches || eligibleBatches.length === 0}
          className="min-h-10 rounded-xl bg-[#00450d] px-5 py-2 text-sm font-bold text-white hover:bg-[#006e1c] disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? "Đang tạo..." : "Tạo và bật Flash Sale"}
        </button>
      </div>
    </form>
  );
}
