/* Customer cart management: quantities and prices are refreshed by the server API. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "../../context/useCart";
import { formatCurrencyVnd } from "../../services/publicApi";
import { showGlobalToast } from "../../components/GlobalToast";
import { notifyApiErrorToast } from "../../services/axiosClient";

export default function CartPage() {
  const { items, isLoading, error, refreshCart, updateItem, removeItem } = useCart();
  const [busyItems, setBusyItems] = useState([]);
  const [quantities, setQuantities] = useState({});

  const setBusy = (productId, busy) => {
    setBusyItems((current) => busy
      ? [...new Set([...current, productId])]
      : current.filter((id) => id !== productId));
  };

  const handleQuantityUpdate = async (item, rawQuantity) => {
    const quantity = Number(rawQuantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setQuantities((current) => ({ ...current, [item.id]: String(item.quantity) }));
      showGlobalToast("Số lượng phải là số nguyên dương.", "warning");
      return;
    }
    if (quantity === Number(item.quantity)) return;

    setBusy(item.id, true);
    try {
      const updatedItems = await updateItem(item.id, quantity);
      const updatedItem = updatedItems.find((cartItem) => cartItem.id === item.id);
      setQuantities((current) => ({
        ...current,
        [item.id]: String(updatedItem?.quantity ?? quantity),
      }));
    } catch (requestError) {
      setQuantities((current) => ({ ...current, [item.id]: String(item.quantity) }));
      notifyApiErrorToast(requestError, "Không thể cập nhật số lượng.");
    } finally {
      setBusy(item.id, false);
    }
  };

  const handleRemove = async (item) => {
    setBusy(item.id, true);
    try {
      await removeItem(item.id);
      showGlobalToast(`Đã xóa "${item.name}" khỏi giỏ hàng.`, "success");
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể xóa sản phẩm khỏi giỏ hàng.");
    } finally {
      setBusy(item.id, false);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshCart();
    } catch (requestError) {
      notifyApiErrorToast(requestError, "Không thể tải giỏ hàng.");
    }
  };

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.line_total ?? item.price * item.quantity),
    0
  );
  // Nếu dữ liệu giỏ cũ vượt tồn mới, yêu cầu khách xử lý trước khi sang checkout.
  const unavailableItems = items.filter((item) => !item.is_available);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <nav aria-label="Điều hướng trang" className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link to="/" className="hover:text-emerald-800">Trang Chủ</Link>
        <span aria-hidden="true">›</span>
        <span className="font-semibold text-emerald-900">Giỏ Hàng &amp; Đặt Hàng</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#15351d] sm:text-4xl">Giỏ Hàng &amp; Đặt Hàng</h1>
          <p className="mt-2 text-sm text-slate-600">
            {items.length ? `${items.length} sản phẩm trong giỏ` : "Kiểm tra sản phẩm trước khi đặt hàng"}
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Tiếp tục mua sắm
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600" role="status">
          Đang tải giỏ hàng...
        </div>
      ) : error && items.length === 0 ? (
        <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
          <p className="text-red-700">{error}</p>
          <button type="button" onClick={handleRefresh} className="mt-4 rounded-xl bg-emerald-800 px-5 py-2.5 font-bold text-white">
            Tải lại giỏ hàng
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-slate-100 bg-white px-6 py-14 text-center shadow-sm sm:min-h-[500px]">
          <div className="max-w-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#f1f3f1] text-slate-500">
              <ShoppingBag className="h-9 w-9" aria-hidden="true" />
            </div>
            <h2 className="mt-7 text-2xl font-extrabold tracking-tight text-[#15351d] sm:text-3xl">
              Giỏ Hàng Nông Sản Đang Trống
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-500">
              Bạn chưa chọn món nông sản sạch nào. Hãy ghé thăm vườn hữu cơ XanhFarm và chọn những loại rau củ hái sương mai tươi ngon nhé!
            </p>
            <Link
              to="/products"
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#0b4524] px-7 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Khám Phá Nông Sản Tươi Hôm Nay
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {items.map((item) => {
              const isBusy = busyItems.includes(item.id);
              return (
                <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-emerald-200 sm:flex-row sm:items-center">
                  <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-emerald-50">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-emerald-800">
                        <ShoppingBag className="h-8 w-8" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-bold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatCurrencyVnd(item.price)} / {item.unit || "đơn vị"}
                    </p>
                    {!item.is_available && (
                      <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
                        Sản phẩm hiện không đủ tồn kho (còn {item.available_stock} {item.unit}). Hãy chỉnh số lượng hoặc xóa khỏi giỏ.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="flex items-center rounded-xl border border-slate-200">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng ${item.name}`}
                        disabled={isBusy || Number(item.quantity) <= 1}
                        onClick={() => handleQuantityUpdate(item, Math.max(1, Math.floor(Number(item.quantity)) - 1))}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center text-slate-700 transition hover:text-emerald-800 disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input
                        aria-label={`Số lượng ${item.name}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[1-9][0-9]*"
                        value={quantities[item.id] ?? item.quantity}
                        disabled={isBusy}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (/^(?:[1-9]\d*)?$/.test(value)) {
                            setQuantities((current) => ({ ...current, [item.id]: value }));
                          }
                        }}
                        onBlur={() => handleQuantityUpdate(item, quantities[item.id] ?? item.quantity)}
                        className="min-h-11 w-20 border-x border-slate-200 px-2 py-2 text-center text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
                      />
                      <button
                        type="button"
                        aria-label={`Tăng số lượng ${item.name}`}
                        disabled={isBusy}
                        onClick={() => handleQuantityUpdate(item, Math.floor(Number(item.quantity)) + 1)}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center text-slate-700 transition hover:text-emerald-800 disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="min-w-28 text-right">
                      <p className="font-extrabold text-emerald-900">{formatCurrencyVnd(item.line_total)}</p>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleRemove(item)}
                        className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24">
            <h2 className="text-lg font-extrabold text-slate-900">Tóm tắt đơn hàng</h2>
            <div className="mt-4 flex justify-between gap-4 text-sm text-slate-600">
              <span>Tạm tính</span>
              <span className="font-bold text-slate-900">{formatCurrencyVnd(subtotal)}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Phí giao hàng sẽ được tính tại bước đặt hàng. Giỏ hàng chưa giữ chỗ tồn kho; số lượng sẽ được kiểm tra lại khi đặt hàng.
            </p>
            {unavailableItems.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
                Vui lòng xử lý sản phẩm không đủ hàng trước khi tiếp tục.
              </p>
            )}
            <Link
              to="/checkout"
              aria-disabled={unavailableItems.length > 0}
              onClick={(event) => {
                if (unavailableItems.length > 0) event.preventDefault();
              }}
              className={`mt-5 block w-full rounded-xl px-5 py-3 text-center font-bold text-white ${
                unavailableItems.length > 0
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-emerald-800 hover:bg-emerald-700"
              }`}
            >
              Tiếp tục đặt hàng
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
