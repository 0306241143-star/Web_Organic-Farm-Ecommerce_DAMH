import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

const CARRIER_PRESETS = [
  "Đội giao hàng XanhFarm",
  "GrabExpress",
  "Ahamove",
  "Giao Hàng Nhanh (GHN)",
  "Giao Hàng Tiết Kiệm (GHTK)",
];

const DELIVERY_STATUS_OPTIONS = [
  {
    value: "Chuan_bi",
    label: "Chuẩn bị hàng",
    description: "Đã gán đơn vị vận chuyển, đang đóng gói xuất kho",
  },
  {
    value: "Dang_giao",
    label: "Đang giao hàng",
    description: "Tự động chuyển trạng thái đơn sang Đang giao",
  },
  {
    value: "Giao_thanh_cong",
    label: "Giao thành công",
    description: "Tự động hoàn tất đơn hàng (Hoàn thành)",
  },
  {
    value: "Giao_that_bai",
    label: "Giao thất bại",
    description: "Ghi nhận giao không thành công để xử lý lại",
  },
];

function generateTrackingCode(orderId) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `XF${yy}${mm}${dd}-${orderId}`;
}

export default function DispatchOrderModal({
  open,
  order,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [carrier, setCarrier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [status, setStatus] = useState("Chuan_bi");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!open || !order) return;
    setCarrier(order.delivery?.carrier || "Đội giao hàng XanhFarm");
    setTrackingNumber(order.delivery?.tracking_number || "");
    setStatus(order.delivery?.status || "Chuan_bi");
    setValidationError("");
  }, [open, order]);

  if (!open || !order) return null;

  const recipientName =
    order.address?.recipient_name || order.customer?.name || "Khách hàng";
  const recipientPhone =
    order.address?.phone || order.customer?.phone || "";
  const recipientAddress =
    order.address?.detail || "Không có thông tin địa chỉ";

  const handleGenerateTracking = () => {
    setTrackingNumber(generateTrackingCode(order.order_id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedCarrier = carrier.trim();
    if (!trimmedCarrier) {
      setValidationError("Vui lòng nhập hoặc chọn đơn vị vận chuyển.");
      return;
    }
    setValidationError("");
    onSubmit?.({
      carrier: trimmedCarrier,
      tracking_number: trackingNumber.trim() || null,
      status,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dispatch-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <div className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        {/* Header cố định không bị đẩy tràn */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-[#0d542b] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3
                id="dispatch-modal-title"
                className="text-sm sm:text-base font-extrabold leading-tight truncate"
              >
                {order.delivery
                  ? `Cập Nhật Giao Nhận #${order.order_id}`
                  : `Điều Phối Giao Hàng #${order.order_id}`}
              </h3>
              <p className="text-xs text-emerald-100/90 mt-0.5 truncate tabular-nums">
                {recipientName}
                {recipientPhone ? ` · ${recipientPhone}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Đóng hộp thoại"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân form cuộn nội bộ */}
        <form
          id="dispatch-order-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 sm:p-5 space-y-4"
        >
          {/* Thông tin người nhận */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-xs">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900">
                {recipientName}
                {recipientPhone && (
                  <span className="font-normal text-slate-500 ml-1 tabular-nums">
                    · {recipientPhone}
                  </span>
                )}
              </p>
              <p className="text-slate-600 leading-relaxed mt-0.5 break-words">
                {recipientAddress}
              </p>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700"
            >
              {validationError}
            </div>
          )}

          {/* Đơn vị vận chuyển */}
          <div className="space-y-2">
            <label
              htmlFor="dispatch-carrier"
              className="block text-xs font-bold text-slate-800"
            >
              Đơn vị vận chuyển <span className="text-red-500">*</span>
            </label>
            <input
              id="dispatch-carrier"
              type="text"
              value={carrier}
              onChange={(e) => {
                setCarrier(e.target.value);
                if (validationError) setValidationError("");
              }}
              placeholder="Nhập hoặc chọn đơn vị vận chuyển..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {CARRIER_PRESETS.map((preset) => {
                const isSelected = carrier.trim() === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCarrier(preset);
                      if (validationError) setValidationError("");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-800 border-emerald-400"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mã vận đơn */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="dispatch-tracking"
                className="text-xs font-bold text-slate-800"
              >
                Mã vận đơn
              </label>
              <button
                type="button"
                onClick={handleGenerateTracking}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo mã tự động</span>
              </button>
            </div>
            <input
              id="dispatch-tracking"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="VD: XF261125-31"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Trạng thái vận chuyển */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-800">
              Trạng thái vận chuyển <span className="text-red-500">*</span>
            </span>
            <div className="space-y-2">
              {DELIVERY_STATUS_OPTIONS.map((opt) => {
                const active = status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      active
                        ? "bg-emerald-50/75 border-emerald-500 ring-1 ring-emerald-500/30"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-xs sm:text-[13px] font-bold ${
                          active ? "text-emerald-900" : "text-slate-800"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </div>
                    {active && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer cố định chứa 2 nút hành động */}
        <div className="px-4 py-3 sm:px-5 border-t border-slate-100 bg-slate-50/95 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            form="dispatch-order-form"
            disabled={submitting}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#0d6e38] hover:bg-[#09572b] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 shrink-0" />
                <span>Lưu Điều Phối Giao Hàng</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}