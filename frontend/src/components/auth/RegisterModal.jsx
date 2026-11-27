/* ==========================================================================
 * FORM NỔI ĐĂNG KÝ TÀI KHOẢN KHÁCH HÀNG (REGISTER MODAL)
 * Hiển thị dạng popup đè lên giao diện hiện tại của cửa hàng.
 * ========================================================================== */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { authApi } from "../../services/authApi";
import { showGlobalToast } from "../GlobalToast";

export default function RegisterModal({ isOpen, onClose, redirectTo = null }) {
  const { login, setUser, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Đóng modal khi nhấn Escape & khóa cuộn trang nền
  useEffect(() => {
    if (!isOpen) return undefined;

    // Khoá cuộn trang nền và hỗ trợ đóng form bằng phím Escape.

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, submitting, onClose]);

  // Xóa thông báo lỗi cũ mỗi khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setFieldErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSwitchToLogin = () => {
    if (submitting) return;
    if (location.pathname === "/register") {
      navigate("/login", { replace: true, state: location.state });
      return;
    }
    openLoginModal(redirectTo);
  };

  const handleSubmit = async (e) => {
    // Kiểm tra dữ liệu bắt buộc và quy tắc mật khẩu trước khi gọi API.
    e.preventDefault();
    if (submitting) return;

    setErrorMessage("");
    setFieldErrors({});

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErrorMessage("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      return;
    }

    if (form.password.length < 8) {
      setFieldErrors({ password: ["Mật khẩu phải có ít nhất 8 ký tự."] });
      return;
    }

    if (form.password !== form.password_confirmation) {
      setFieldErrors({
        password_confirmation: ["Mật khẩu xác nhận không khớp."],
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      const payload = response.data?.data ?? response.data ?? {};
      const token = payload.token || payload.access_token;
      const userData = payload.user;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("access_token", token);
      }

      if (typeof login === "function" && userData) {
        login(userData, token);
      } else if (typeof setUser === "function" && userData) {
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }

      showGlobalToast(
        `Đăng ký thành công! Chào mừng ${userData?.name || form.name} đến với XanhFarm.`,
        "success"
      );

      onClose();

      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else if (location.pathname === "/register") {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const errors = err?.fieldErrors ?? err?.response?.data?.errors ?? {};
      setFieldErrors(errors);
      const firstError = Object.values(errors).flat()[0];
      setErrorMessage(
        firstError ||
          err?.message ||
          err?.response?.data?.message ||
          "Không thể đăng ký tài khoản. Vui lòng kiểm tra lại thông tin."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-2xs overflow-y-auto"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="register-modal-title"
    >
      <div
        className="relative w-full max-w-md my-auto rounded-2xl bg-white border border-[#e5e7eb] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Đóng cửa sổ đăng ký"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header thương hiệu */}
        <div className="bg-gradient-to-br from-[#00450d] to-[#0a661c] px-6 pt-6 pb-5 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-[11px] font-bold tracking-wide uppercase">
            <Leaf className="w-3.5 h-3.5" />
            <span>Thành viên XanhFarm</span>
          </div>
          <h2 id="register-modal-title" className="text-xl font-black mt-2.5">
            Tạo tài khoản mới
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Nhận ngay ưu đãi thành viên, đặt gói rau định kỳ và tích điểm đổi quà.
          </p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Họ và tên */}
          <div>
            <label
              htmlFor="modal-reg-name"
              className="block font-bold text-[#191c1b] mb-1"
            >
              Họ và tên *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-reg-name"
                type="text"
                autoFocus
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
              />
            </div>
            {fieldErrors.name && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name[0]}</p>
            )}
          </div>

          {/* Email & Số điện thoại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-reg-email"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Email *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reg-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="ban@email.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="modal-reg-phone"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Số điện thoại *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reg-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="0912345678"
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                />
              </div>
              {fieldErrors.phone && (
                <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.phone[0]}</p>
              )}
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label
              htmlFor="modal-reg-password"
              className="block font-bold text-[#191c1b] mb-1"
            >
              Mật khẩu * (tối thiểu 8 ký tự)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-reg-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.password[0]}</p>
            )}
          </div>

          {/* Nhập lại mật khẩu */}
          <div>
            <label
              htmlFor="modal-reg-confirm"
              className="block font-bold text-[#191c1b] mb-1"
            >
              Xác nhận mật khẩu *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-reg-confirm"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password_confirmation}
                onChange={(e) => updateField("password_confirmation", e.target.value)}
                placeholder="Nhập lại mật khẩu"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {fieldErrors.password_confirmation && (
              <p className="mt-1 text-[11px] text-rose-600">
                {fieldErrors.password_confirmation[0]}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 mt-1 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <UserPlus className="w-4 h-4" />
            <span>{submitting ? "Đang tạo tài khoản..." : "Đăng ký tài khoản"}</span>
          </button>

          <div className="pt-3 border-t border-slate-100 text-center text-[#5a6357]">
            Đã có tài khoản XanhFarm?{" "}
            <button
              type="button"
              onClick={handleSwitchToLogin}
              className="font-bold text-[#00450d] hover:underline cursor-pointer"
            >
              Đăng nhập ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}