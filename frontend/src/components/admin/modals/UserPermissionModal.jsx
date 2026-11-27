/* Modal for creating accounts and updating roles/status. */
import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ShieldAlert,
  UserPlus,
  UserCog,
  X,
} from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";

export default function UserPermissionModal({
  isOpen = false,
  onClose,
  editingUser = null,
  roles = [],
  onSaved,
}) {
  const [form, setForm] = useState({
    Ho_ten: "",
    Email: "",
    So_dien_thoai: "",
    Ma_vai_tro: 3,
    Mat_khau: "",
    Trang_thai: "Hoat_dong",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingUser) {
      setForm({
        Ho_ten: editingUser.name || "",
        Email: editingUser.email || "",
        So_dien_thoai: editingUser.phone || "",
        Ma_vai_tro: editingUser.role_id || 4,
        Mat_khau: "",
        Trang_thai: editingUser.status || "Hoat_dong",
      });
    } else {
      setForm({
        Ho_ten: "",
        Email: "",
        So_dien_thoai: "",
        Ma_vai_tro: 3, // Mặc định ưu tiên tạo tài khoản nhân viên Farm Staff
        Mat_khau: "",
        Trang_thai: "Hoat_dong",
      });
    }
    setShowPassword(false);
    setFormError("");
  }, [isOpen, editingUser]);

  if (!isOpen) return null;

  const selectedRole = roles.find(
    (r) => Number(r.id) === Number(form.Ma_vai_tro)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.Ho_ten.trim() || !form.Email.trim()) {
      setFormError("Vui lòng nhập đầy đủ họ tên và địa chỉ email.");
      return;
    }

    if (!editingUser && form.Mat_khau.length < 6) {
      setFormError("Mật khẩu khởi tạo phải có ít nhất 6 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        Ho_ten: form.Ho_ten.trim(),
        Email: form.Email.trim(),
        So_dien_thoai: form.So_dien_thoai.trim() || null,
        Ma_vai_tro: Number(form.Ma_vai_tro),
        Trang_thai: form.Trang_thai,
      };
      if (form.Mat_khau.trim()) {
        payload.Mat_khau = form.Mat_khau;
      }

      if (editingUser) {
        const res = await adminApi.updateUser(editingUser.id, payload);
        const updated = res.data?.data ?? res.data;
        showGlobalToast(`Đã cập nhật tài khoản "${payload.Ho_ten}".`);
        onSaved(updated, true);
      } else {
        const res = await adminApi.createUser(payload);
        const created = res.data?.data ?? res.data;
        showGlobalToast(`Đã tạo mới tài khoản "${payload.Ho_ten}".`);
        onSaved(created, false);
      }
      onClose();
    } catch (err) {
      const firstValidationErr = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : null;
      setFormError(
        firstValidationErr ||
          err?.response?.data?.message ||
          err?.message ||
          "Không thể lưu thông tin tài khoản."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phân quyền người dùng"
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}
    >
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#064e2e] text-white flex items-center justify-center shrink-0">
              {editingUser ? (
                <UserCog className="w-5 h-5" />
              ) : (
                <UserPlus className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {editingUser ? "Cập Nhật Tài Khoản" : "Tạo Tài Khoản Mới"}
              </h3>
              <p className="text-xs text-slate-500">
                Cấp tài khoản nhân viên (Farm Staff, Sales) hoặc người dùng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
        >
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Họ và Tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.Ho_ten}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, Ho_ten: e.target.value }))
              }
              placeholder="Ví dụ: Nguyễn Văn Nông"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Đăng Nhập <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.Email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, Email: e.target.value }))
                }
                placeholder="nhanvien@nongsansach.vn"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số Điện Thoại
              </label>
              <input
                type="tel"
                value={form.So_dien_thoai}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, So_dien_thoai: e.target.value }))
                }
                placeholder="0901234567"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Chọn Vai trò */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Vai Trò & Nhóm Quyền <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((r) => {
                const isSelected = Number(form.Ma_vai_tro) === Number(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={editingUser?.is_protected}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, Ma_vai_tro: Number(r.id) }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-50 ${
                      isSelected
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="text-xs font-extrabold">{r.code}</div>
                    <div className="text-[10.5px] text-slate-500 line-clamp-1 mt-0.5">
                      {r.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedRole && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  Vai trò <strong>{selectedRole.label}</strong> hiện được cấu hình{" "}
                  <strong>{selectedRole.permission_ids?.length || 0} quyền</strong>.
                  {Number(selectedRole.id) === 3 &&
                    " (Không có quyền xem doanh thu và dữ liệu khách hàng)."}
                </span>
              </div>
            )}
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {editingUser ? "Đổi Mật Khẩu Mới (Bỏ trống nếu giữ nguyên)" : "Mật Khẩu Khởi Tạo"}{" "}
              {!editingUser && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={form.Mat_khau}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, Mat_khau: e.target.value }))
                }
                placeholder={
                  editingUser ? "Nhập mật khẩu mới nếu muốn đặt lại..." : "Tối thiểu 6 ký tự"
                }
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                required={!editingUser}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Trạng thái tài khoản */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Trạng Thái Hoạt Động
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              {[
                { value: "Hoat_dong", label: "Hoạt động" },
                { value: "Khoa", label: "Khóa tài khoản" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={editingUser?.is_protected}
                  onClick={() =>
                    setForm((prev) => ({ ...prev, Trang_thai: opt.value }))
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                    form.Trang_thai === opt.value
                      ? opt.value === "Khoa"
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-white text-emerald-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div   className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
            
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingUser ? "Lưu Thay Đổi" : "Tạo Tài Khoản"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}