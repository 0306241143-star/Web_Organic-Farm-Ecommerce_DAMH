/* Khối khoảng cách giao hàng, đổi điểm thưởng Loyalty và tóm tắt thanh toán. */
import { Award, Loader2, ShieldCheck, Truck } from "lucide-react";
import { formatCurrencyVnd } from "../../../services/publicApi";

export default function CheckoutSummaryCard({
  itemsCount,
  itemsSubtotal,
  originName,
  distanceKm,
  pricePerKm,
  shippingFee,
  pointsDiscount,
  finalTotal,
  availablePoints,
  pointVndRate,
  maxRedeemablePoints,
  useRewardPoints,
  pointsInput,
  onTogglePoints,
  onChangePointsInput,
  paymentMethod,
  apiPayReady,
  selectedAddressId,
  quoteLoading,
  submitting,
  onPlaceOrder,
}) {
  return (
    <>
      {/* Khoảng cách giao hàng */}
      <section className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 shadow-2xs space-y-1.5 text-xs">
        <h2 className="text-sm sm:text-base font-extrabold text-[#191c1b] flex items-center gap-2 mb-1">
          <Truck className="w-4 h-4 text-[#006e1c]" />
          <span>Khoảng cách giao hàng</span>
        </h2>
        <p className="text-[#41493e]">
          {originName} đến địa chỉ nhận:{" "}
          <strong className="text-[#191c1b] tabular-nums">{distanceKm} km</strong>
        </p>
        <p className="text-[#5a6357]">
          Đơn giá {formatCurrencyVnd(pricePerKm)}/km
        </p>
      </section>

      {/* Tóm tắt thanh toán & Đổi điểm thưởng Loyalty */}
      <section className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 shadow-2xs space-y-4">
        <h2 className="text-base sm:text-lg font-extrabold text-[#191c1b]">
          Tóm tắt thanh toán
        </h2>

        {/* Đổi điểm thưởng Loyalty */}
        <div className="rounded-2xl bg-[#f8faf8] border border-[#c0c9bb]/55 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
              <input
                type="checkbox"
                checked={useRewardPoints}
                disabled={maxRedeemablePoints <= 0}
                onChange={(e) => onTogglePoints(e.target.checked)}
                className="w-4 h-4 rounded accent-[#00450d] disabled:opacity-40"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs sm:text-[13px] font-extrabold text-[#191c1b]">
                  <Award className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Đổi điểm thưởng Loyalty</span>
                </span>
                <span className="block text-[11px] text-[#5a6357]">
                  Bạn có{" "}
                  <strong className="text-[#191c1b]">
                    {availablePoints.toLocaleString("vi-VN")}
                  </strong>{" "}
                  điểm khả dụng (1 điểm = {formatCurrencyVnd(pointVndRate)}).
                </span>
              </span>
            </label>

            <span className="text-xs font-extrabold text-[#006e1c] shrink-0">
              Áp dụng điểm
            </span>
          </div>

          {useRewardPoints && maxRedeemablePoints > 0 && (
            <div className="pt-2 border-t border-[#c0c9bb]/40 flex items-center justify-between gap-2 text-xs">
              <span className="text-[#41493e] font-semibold">
                Số điểm muốn dùng (tối đa {maxRedeemablePoints}):
              </span>
              <input
                type="number"
                min={1}
                max={maxRedeemablePoints}
                value={pointsInput}
                onChange={(e) => onChangePointsInput(e.target.value)}
                className="w-24 px-2.5 py-1 rounded-xl bg-white border border-[#c0c9bb]/80 text-right font-extrabold text-[#00450d] tabular-nums outline-none focus:border-[#00450d]"
              />
            </div>
          )}
        </div>

        {/* Chi tiết cộng tiền */}
        <div className="space-y-2.5 text-xs sm:text-[13.5px]">
          <div className="flex items-center justify-between text-[#41493e]">
            <span>Tạm tính ({itemsCount} món)</span>
            <span className="font-extrabold text-[#191c1b] tabular-nums">
              {formatCurrencyVnd(itemsSubtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#41493e]">
            <span>Phí giao hàng ({distanceKm} km)</span>
            <span className="font-extrabold text-[#191c1b] tabular-nums">
              {quoteLoading ? "..." : formatCurrencyVnd(shippingFee)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#006e1c]">
            <span>Giảm từ điểm thưởng</span>
            <span className="font-extrabold tabular-nums">
              {pointsDiscount > 0 ? `-${formatCurrencyVnd(pointsDiscount)}` : "0đ"}
            </span>
          </div>
        </div>

        {/* Tổng thanh toán */}
        <div className="pt-3.5 border-t border-[#c0c9bb]/40 flex items-baseline justify-between gap-3">
          <span className="text-sm sm:text-base font-extrabold text-[#191c1b]">
            Tổng thanh toán
          </span>
          <span className="text-2xl font-black text-[#00450d] tabular-nums">
            {formatCurrencyVnd(finalTotal)}
          </span>
        </div>

        <p className="text-[11px] text-[#5a6357] leading-relaxed">
          Số tiền và tồn kho được kiểm tra lại ở máy chủ khi tạo đơn. Giỏ hàng chỉ bị xóa sau
          khi tạo đơn thành công.
        </p>

        {paymentMethod === "ApiPay" && !apiPayReady && (
          <p className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            Cổng ApiPay chưa sẵn sàng, vui lòng chọn phương thức COD hoặc liên hệ quản trị viên.
          </p>
        )}

        <button
          type="button"
          disabled={
            submitting ||
            quoteLoading ||
            !selectedAddressId ||
            (paymentMethod === "ApiPay" && !apiPayReady)
          }
          onClick={onPlaceOrder}
          className="w-full min-h-12 px-5 py-3.5 rounded-2xl bg-[#00450d] hover:bg-[#006e1c] text-white text-sm font-extrabold shadow-sm transition-all flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tạo đơn hàng...</span>
            </>
          ) : (
            <span>
              {paymentMethod === "ApiPay"
                ? "Đặt hàng & thanh toán"
                : "Xác nhận đặt hàng (COD)"}
            </span>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#006e1c]">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Bảo mật thanh toán · Cam kết đổi mới hoặc hoàn tiền nếu rau bị dập nát</span>
        </div>
      </section>
    </>
  );
}