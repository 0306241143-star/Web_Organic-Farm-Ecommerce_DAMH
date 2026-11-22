/* Khung tóm tắt đơn hàng trong trang giỏ hàng với chỉ báo bước đặt hàng và cam kết giao tươi. */
import {
  ArrowRight,
  Info,
  QrCode,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { formatCurrencyVnd } from "../../services/publicApi";

export default function CartSummaryBox({
  itemsCount = 0,
  totalQuantity = 0,
  subtotal = 0,
  hasStockIssue = false,
  isBusy = false,
  onProceedCheckout,
}) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  const estimatedPoints = Math.floor(safeSubtotal / 10000);
  const formattedTotalQty = Number.isInteger(totalQuantity)
    ? totalQuantity.toLocaleString("vi-VN")
    : Number(totalQuantity || 0).toLocaleString("vi-VN", {
        maximumFractionDigits: 1,
      });

  return (
    <aside aria-label="Tóm tắt đơn hàng" className="lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-3xl bg-white border border-[#c0c9bb]/50 shadow-sm">
        {/* Header thẻ tóm tắt */}
        <div className="bg-gradient-to-r from-[#00450d] to-[#006e1c] px-6 py-4 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
              Tóm tắt đơn hàng
            </h2>
            <p className="text-[11px] text-emerald-100/85 mt-0.5">
              Bước 1 / 2 · Kiểm tra giỏ hàng
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-white/15 text-[#91f78e] text-xs font-extrabold tabular-nums">
            {itemsCount} món
          </span>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Chi tiết tiền hàng */}
          <div className="space-y-3 text-xs sm:text-[13.5px]">
            <div className="flex items-center justify-between text-[#41493e]">
              <span>Số lượng nông sản</span>
              <span className="font-bold text-[#191c1b] tabular-nums">
                {itemsCount} loại ({formattedTotalQty} đơn vị)
              </span>
            </div>

            <div className="flex items-center justify-between text-[#41493e]">
              <span>Tạm tính tiền hàng</span>
              <span className="font-extrabold text-[#191c1b] tabular-nums">
                {formatCurrencyVnd(safeSubtotal)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[#41493e]">
              <span>Phí giao hàng</span>
              <span className="text-xs font-semibold text-[#5a6357]">
                Tính theo khoảng cách ở bước sau
              </span>
            </div>

            {estimatedPoints > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-amber-50/80 border border-amber-200/70 px-3 py-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Điểm thưởng dự kiến</span>
                </span>
                <span className="font-extrabold text-amber-800 tabular-nums">
                  +{estimatedPoints.toLocaleString("vi-VN")} điểm
                </span>
              </div>
            )}
          </div>

          {/* Tổng cộng tạm tính */}
          <div className="pt-4 border-t border-[#c0c9bb]/40 flex items-baseline justify-between gap-3">
            <div>
              <span className="block text-sm font-extrabold text-[#191c1b]">
                Tổng tạm tính
              </span>
              <span className="text-[11px] text-[#5a6357]">
                Chưa bao gồm phí vận chuyển
              </span>
            </div>
            <span className="text-2xl font-black text-[#00450d] tabular-nums">
              {formatCurrencyVnd(safeSubtotal)}
            </span>
          </div>

          {/* Lưu ý giữ chỗ tồn kho FEFO */}
          <div className="rounded-2xl bg-[#f6f8f6] border border-[#c0c9bb]/45 p-3.5 flex items-start gap-2.5 text-[11.5px] text-[#41493e] leading-relaxed">
            <Info className="w-4 h-4 text-[#006e1c] shrink-0 mt-0.5" />
            <span>
              Phí giao hàng sẽ được tính tự động theo địa chỉ tại bước đặt hàng.
            </span>
          </div>

          {/* Nút tiếp tục đặt hàng */}
          <button
            type="button"
            disabled={itemsCount === 0 || hasStockIssue || isBusy}
            onClick={onProceedCheckout}
            className="w-full min-h-12 px-5 py-3.5 rounded-2xl bg-[#00450d] hover:bg-[#006e1c] text-white text-sm font-extrabold shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Tiếp tục đặt hàng</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* 3 cam kết dịch vụ gọn gàng */}
          <div className="pt-3 border-t border-[#c0c9bb]/30 grid grid-cols-3 gap-2 text-center text-[11px] text-[#41493e]">
            <div className="rounded-xl bg-[#f8faf8] p-2 border border-[#c0c9bb]/30 flex flex-col items-center gap-1">
              <Truck className="w-4 h-4 text-[#006e1c]" />
              <span className="font-semibold leading-tight">Giao tươi 2H</span>
            </div>
            <div className="rounded-xl bg-[#f8faf8] p-2 border border-[#c0c9bb]/30 flex flex-col items-center gap-1">
              <QrCode className="w-4 h-4 text-[#006e1c]" />
              <span className="font-semibold leading-tight">Chuẩn mã QR</span>
            </div>
            <div className="rounded-xl bg-[#f8faf8] p-2 border border-[#c0c9bb]/30 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-[#006e1c]" />
              <span className="font-semibold leading-tight">Đổi trả 100%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}