import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, RefreshCw } from "lucide-react";
import { salesApi } from "../../../services/salesApi";

export default function StockAlertPanel({
  order,
  stockAlert,
  busyAction,
  onReplace,
  onPostpone,
}) {
  const [replacementResults, setReplacementResults] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all(
      (stockAlert.items || []).map(async (item) => {
        try {
          const response = await salesApi.getReplacementProducts(
            order.order_id,
            item.detail_id
          );
          return [item.detail_id, { products: response.data || [] }];
        } catch (error) {
          return [
            item.detail_id,
            { error: error.message || "Không thể tải sản phẩm thay thế." },
          ];
        }
      })
    ).then((results) => {
      if (active) {
        setReplacementResults((current) => ({
          ...current,
          [order.order_id]: Object.fromEntries(results),
        }));
      }
    });

    return () => {
      active = false;
    };
  }, [order.order_id, stockAlert]);

  const isBusy = Boolean(busyAction);

  return (
    <section className="mx-4 mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 sm:mx-5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-extrabold text-rose-900">
            {stockAlert.items.length > 0
              ? "Đơn định kỳ chưa đủ hàng"
              : "Đơn định kỳ đã được hoãn"}
          </h4>
          {stockAlert.postponed_until && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-800">
              <CalendarClock className="h-3.5 w-3.5" />
              Dự kiến giao lại:{" "}
              {new Date(`${stockAlert.postponed_until}T00:00:00`).toLocaleDateString("vi-VN")}
            </p>
          )}
        </div>
      </div>

      {stockAlert.items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {stockAlert.items.map((item) => {
            const result = replacementResults[order.order_id]?.[item.detail_id];
            const products = result?.products || [];

            return (
              <div
                key={item.detail_id}
                className="rounded-xl border border-rose-100 bg-white p-3"
              >
                <p className="text-xs font-bold text-slate-800">
                  {item.product_name}: thiếu {item.missing_quantity} {item.unit || ""}
                </p>
                {!result ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Đang tìm sản phẩm thay thế...
                  </p>
                ) : result.error ? (
                  <p role="alert" className="mt-2 text-[11px] text-red-700">
                    {result.error}
                  </p>
                ) : products.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {products.map((product) => (
                      <button
                        key={product.product_id}
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          onReplace(order, item.detail_id, product.product_id)
                        }
                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-left text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-50"
                      >
                        {product.name} · còn {product.available_quantity} {product.unit}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-600">
                    Chưa có sản phẩm cùng đơn vị đủ tồn kho.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-600">
          Đơn đã được hoãn; hệ thống sẽ tiếp tục xử lý vào kỳ giao đã hẹn.
        </p>
      )}

      {stockAlert.items.length > 0 && (
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onPostpone(order)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-50 disabled:cursor-wait disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {busyAction === `postpone:${order.order_id}` ? "Đang hoãn..." : "Hoãn đến kỳ tuần sau"}
        </button>
      )}
    </section>
  );
}
