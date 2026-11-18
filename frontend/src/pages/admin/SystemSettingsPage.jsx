/* System configuration page for dispatch, FEFO thresholds, flash sale parameters, and customer service. */
import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Truck,
  Zap,
  Calendar,
  Clock,
  HelpCircle,
} from "lucide-react";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast } from "../../components/GlobalToast";

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState({
    delivery_max_distance_km: 25,
    shipping_fee_base: 20000,
    shipping_fee_per_km: 5000,
    fefo_warning_days: 3,
    flash_sale_discount_pct: 40,
    reward_point_rate: 1000,
    auto_cancel_unpaid_hours: 24,
    support_hotline: "1900 8888",
    support_email: "cskh@nongsansach.vn",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getSettings();
      if (res.data?.data) {
        setSettings((prev) => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      setError("Không thể tải cấu hình hệ thống. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.updateSettings(settings);
      const okMsg = "Cấu hình hệ thống đã được lưu và cập nhật thành công!";
      setSuccess(okMsg);
      showGlobalToast(okMsg, "success");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      const errMsg = err?.response?.data?.message || "Không thể lưu cài đặt hệ thống.";
      setError(errMsg);
      showGlobalToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Sliders className="w-4.5 h-4.5" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Cấu Hình Tham Số Hệ Thống
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Điều chỉnh bán kính giao hàng, chính sách FEFO cận hạn và tham số vận hành sàn TMĐT XanhFarm.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          disabled={loading || saving}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-700">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Kho vận & Vận chuyển */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Truck className="w-4.5 h-4.5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Vận Chuyển & Tính Phí Giao Hàng (Goong Maps)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Bán kính ship tối đa (km)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={settings.delivery_max_distance_km}
                onChange={(e) => handleChange("delivery_max_distance_km", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Khoảng cách tối đa chấp nhận đơn giao hàng.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Cước cơ bản (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={settings.shipping_fee_base}
                onChange={(e) => handleChange("shipping_fee_base", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Phí cơ bản cho cự ly &le; 3km.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Phí mỗi km tiếp theo (VND)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={settings.shipping_fee_per_km}
                onChange={(e) => handleChange("shipping_fee_per_km", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Phụ thu từ km thứ 4 trở đi.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Kho FEFO & Flash Sale */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Zap className="w-4.5 h-4.5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cơ Chế Kho FEFO & Flash Sale Nông Sản Cận Hạn
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Ngưỡng cảnh báo cận hạn (Ngày)
              </label>
              <input
                type="number"
                min="1"
                max="14"
                value={settings.fefo_warning_days}
                onChange={(e) => handleChange("fefo_warning_days", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Khi lô hàng còn &le; số ngày này trước HSD, hệ thống tự động đẩy vào danh sách cảnh báo.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Mức giảm Flash Sale mặc định (%)
              </label>
              <input
                type="number"
                min="5"
                max="90"
                value={settings.flash_sale_discount_pct}
                onChange={(e) => handleChange("flash_sale_discount_pct", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Phần trăm giảm giá kích cầu xả hàng trước khi nông sản cận hạn.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Đơn hàng & Liên hệ CSKH */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4.5 h-4.5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Thời Gian Hủy Đơn & Kênh Hỗ Trợ
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Thời gian chờ thanh toán (Giờ)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={settings.auto_cancel_unpaid_hours}
                onChange={(e) => handleChange("auto_cancel_unpaid_hours", Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Tự hủy đơn và hoàn kho nếu chưa thanh toán qua ApiPay.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Hotline hỗ trợ CSKH
              </label>
              <input
                type="text"
                value={settings.support_hotline}
                onChange={(e) => handleChange("support_hotline", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Hiển thị trên hóa đơn và trang khiếu nại.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Email CSKH tiếp nhận
              </label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => handleChange("support_email", e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10.5px] text-slate-500 mt-1 block">
                Email gửi thông báo khiếu nại và đổi trả.
              </span>
            </div>
          </div>
        </div>

        {/* Save Button Dock */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-[#00450d] hover:bg-[#00380a] text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#86efac]" />
            ) : (
              <Save className="w-4 h-4 text-[#86efac]" />
            )}
            <span>{saving ? "Đang lưu cấu hình..." : "Lưu Cấu Hình Hệ Thống"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
