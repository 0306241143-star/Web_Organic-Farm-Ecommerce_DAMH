/* Khối địa chỉ giao hàng, phương thức thanh toán và ghi chú shipper. */
import { Banknote, QrCode } from "lucide-react";
import AddressDistancePicker from "../AddressDistancePicker";

export default function CheckoutDeliveryAndPayment({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddressCreated,
  originName,
  distanceKm,
  pricePerKm,
  quote,
  quoteLoading,
  quoteError,
  paymentMethod,
  onChangePaymentMethod,
  note,
  onChangeNote,
}) {
  return (
    <>
      <AddressDistancePicker
        addresses={addresses}
        selectedAddressId={selectedAddressId}
        onSelectAddress={onSelectAddress}
        onAddressCreated={onAddressCreated}
        originName={originName}
        distanceKm={distanceKm}
        pricePerKm={pricePerKm}
        quote={quote}
        quoteLoading={quoteLoading}
        quoteError={quoteError}
      />

      <section className="rounded-3xl bg-white border border-[#c0c9bb]/50 p-5 shadow-2xs space-y-3.5">
        <h2 className="text-sm sm:text-base font-extrabold text-[#191c1b]">
          Phương thức thanh toán
        </h2>

        <div className="space-y-2.5">
          {/* Lựa chọn phương thức quyết định luồng thanh toán ở bước gửi đơn. */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              paymentMethod === "ApiPay"
                ? "border-[#006e1c] bg-[#f2fbf2] ring-1 ring-[#006e1c]/20"
                : "border-[#c0c9bb]/60 bg-white hover:border-[#00450d]/40"
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value="ApiPay"
              checked={paymentMethod === "ApiPay"}
              onChange={() => onChangePaymentMethod("ApiPay")}
              className="mt-1 accent-[#00450d]"
            />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#191c1b]">
                <QrCode className="w-4 h-4 text-[#006e1c]" />
                <span>Chuyển khoản trực tuyến ApiPay</span>
              </span>
              <span className="block text-[11.5px] text-[#5a6357] mt-0.5">
                Quét mã QR hoặc mở liên kết để thanh toán an toàn.
              </span>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              paymentMethod === "COD"
                ? "border-[#006e1c] bg-[#f2fbf2] ring-1 ring-[#006e1c]/20"
                : "border-[#c0c9bb]/60 bg-white hover:border-[#00450d]/40"
            }`}
          >
            <input
              type="radio"
              name="payment_method"
              value="COD"
              checked={paymentMethod === "COD"}
              onChange={() => onChangePaymentMethod("COD")}
              className="mt-1 accent-[#00450d]"
            />
            <div className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#191c1b]">
                <Banknote className="w-4 h-4 text-[#006e1c]" />
                <span>Thanh toán khi nhận hàng (COD)</span>
              </span>
              <span className="block text-[11.5px] text-[#5a6357] mt-0.5">
                Kiểm tra nông sản tươi trước khi thanh toán.
              </span>
            </div>
          </label>
        </div>

        <div>
          <label
            htmlFor="checkout-note"
            className="block text-xs font-bold text-[#191c1b] mb-1.5"
          >
            Ghi chú cho shipper (tùy chọn)
          </label>
          <textarea
            id="checkout-note"
            rows={2}
            value={note}
            onChange={(e) => onChangeNote(e.target.value)}
            placeholder="Ví dụ: vui lòng gọi trước khi giao..."
            className="w-full px-3.5 py-2 rounded-2xl bg-[#f8faf8] border border-[#c0c9bb]/70 text-xs sm:text-sm text-[#191c1b] outline-none focus:border-[#00450d] focus:bg-white resize-none"
          />
        </div>
      </section>
    </>
  );
}