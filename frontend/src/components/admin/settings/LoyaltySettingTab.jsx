/* Page 2: Cấu hình tỷ lệ quy đổi điểm thưởng Loyalty ra VNĐ và mô phỏng quy đổi. */
import React, { useState } from "react";
import { Calculator, Coins, Sparkles } from "lucide-react";

export default function LoyaltySettingTab({ value, onChange }) {
  const [previewPoints, setPreviewPoints] = useState("120");

  const numericPointValue = Math.max(0, Number(value) || 0);
  const simulatedPointDiscount = Math.round(
    Math.max(0, Number(previewPoints) || 0) * numericPointValue
  );

return (
    <section className="bg-white rounded-2xl border border-slate-200/85 shadow-2xs overflow-hidden flex flex-col justify-between">      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10.5px] font-mono font-bold uppercase text-amber-700">
                Khóa: diem_quy_doi_vnd
              </span>
              <h2 className="text-base font-extrabold text-slate-900">
                Giá Trị Quy Đổi Điểm Thưởng Loyalty
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70 text-[11px] font-bold shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Ví điểm khách hàng
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Quy định số tiền được khấu trừ trực tiếp vào tổng thanh toán đơn hàng mua lẻ khi khách
          hàng sử dụng điểm tích lũy trong ví thưởng.
        </p>

        <div>
          <label
            htmlFor="setting-point-value"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Số tiền giảm tương ứng 1 điểm (VNĐ / điểm) *
          </label>
          <div className="relative">
            <input
              id="setting-point-value"
              type="number"
              min="1"
              max="10000000"
              step="100"
              required
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full pl-4 pr-24 py-2.5 rounded-xl border border-slate-300 bg-slate-50/60 focus:bg-white text-base font-black text-slate-900 tabular-nums focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              VNĐ / điểm
            </span>
          </div>
        </div>
      </div>

      {/* Khung mô phỏng quy đổi điểm */}
      <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="font-semibold text-slate-600">Khách đổi</span>
          <input
            type="number"
            min="0"
            step="10"
            value={previewPoints}
            onChange={(e) => setPreviewPoints(e.target.value)}
            aria-label="Số điểm thử nghiệm"
            className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white text-center font-bold text-slate-800 tabular-nums"
          />
          <span className="font-semibold text-slate-600">điểm:</span>
        </div>

        <span className="font-black text-amber-800 text-sm tabular-nums">
          Giảm ngay {simulatedPointDiscount.toLocaleString("vi-VN")}đ
        </span>
      </div>
    </section>
  );
}