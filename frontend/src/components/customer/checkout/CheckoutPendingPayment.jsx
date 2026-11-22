/* Màn hình chờ quét mã QR ApiPay sau khi tạo đơn hàng thành công. */
import { ExternalLink, RefreshCw } from "lucide-react";

export default function CheckoutPendingPayment({
  order,
  checkingPayment,
  onCheckStatus,
}) {
  const orderId = order.order_id ?? order.id;
  const paymentUrl = order.pay_url || order.payment_url;

  return (
    <div className="max-w-xl mx-auto rounded-3xl bg-white border border-[#c0c9bb]/50 p-6 sm:p-8 shadow-xs text-center space-y-4">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
        Chờ xác nhận thanh toán ApiPay
      </span>
      <h2 className="text-xl sm:text-2xl font-extrabold text-[#191c1b]">
        Đơn hàng #{orderId} đã được tạo
      </h2>
      <p className="text-xs sm:text-sm text-[#5a6357] leading-relaxed">
        Quét mã QR bên dưới hoặc mở trang thanh toán ApiPay để hoàn tất đơn hàng.
      </p>

      {order.qr_url && (
        <div className="mx-auto w-52 h-52 rounded-2xl bg-[#f8faf8] p-3 border border-emerald-200 flex items-center justify-center">
          <img
            src={order.qr_url}
            alt="Mã QR thanh toán ApiPay"
            className="w-full h-full object-contain"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-[#00450d] hover:bg-[#006e1c] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2"
          >
            <span>Mở trang thanh toán ApiPay</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button
          type="button"
          onClick={onCheckStatus}
          disabled={checkingPayment}
          className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-800 inline-flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${checkingPayment ? "animate-spin" : ""}`} />
          <span>Kiểm tra trạng thái</span>
        </button>
      </div>
    </div>
  );
}