/* Page 1: Cấu hình đơn giá phí giao hàng theo km (Goong Maps API) và mô phỏng tính phí. */
import React, { useState } from "react";
import { Calculator, CheckCircle2, Truck } from "lucide-react";

export default function ShippingSettingTab({ value, onChange }) {
  const [previewDistanceKm, setPreviewDistanceKm] = useState("8.5");

  const numericShipRate = Math.max(0, Number(value) || 0);
  // Mô phỏng phí giao hàng bằng khoảng cách thử nghiệm nhân đơn giá km.
  const simulatedShippingFee = Math.round(
    Math.max(0, Number(previewDistanceKm) || 0) * numericShipRate
  );

  return (
    <section className="bg-white rounded-2xl border border-slate-200/85 shadow-2xs overflow-hidden flex flex-col justify-between">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-[#006e1c] flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase text-emerald-700">
                Khóa: don_gia_ship_km
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                Đơn Giá Phí Giao Hàng Hỏa Tốc
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-[11px] font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Goong Maps API
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Hệ thống tự động đo khoảng cách đường bộ thực tế từ cơ sở nông trại đến địa chỉ nhận
          hàng của khách qua Goong Maps, sau đó nhân với đơn giá này để hiển thị phí ship minh bạch
          tại trang Thanh toán.
        </p>

        <div>
          <label
            htmlFor="setting-shipping-rate"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Đơn giá trên mỗi kilômét (VNĐ / km) *
          </label>
          <div className="relative">
            <input
              id="setting-shipping-rate"
              type="number"
              min="1"
              max="10000000"
              step="100"
              required
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-base font-black text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              VNĐ / km
            </span>
          </div>
        </div>
      </div>

      {/* Khung mô phỏng tính phí ship */}
      <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-700 shrink-0" />
          <span className="font-semibold text-slate-600">Thử tính với</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={previewDistanceKm}
            onChange={(e) => setPreviewDistanceKm(e.target.value)}
            aria-label="Khoảng cách thử nghiệm (km)"
            className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-800 tabular-nums"
          />
          <span className="font-semibold text-slate-600">km:</span>
        </div>

        <span className="font-black text-[#064e2e] text-sm tabular-nums">
          Phí giao = {simulatedShippingFee.toLocaleString("vi-VN")}đ
        </span>
      </div>
    </section>
  );
}