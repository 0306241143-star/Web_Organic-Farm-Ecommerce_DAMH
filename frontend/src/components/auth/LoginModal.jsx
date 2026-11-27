/* ==========================================================================
 * FORM NỔI ĐĂNG NHẬP TÀI KHOẢN (LOGIN MODAL)
 * Hiển thị dạng popup đè lên giao diện hiện tại của cửa hàng.
 * ========================================================================== */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Leaf,
  Lock,
  LogIn,
  Mail,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { authApi } from "../../services/authApi";
import { showGlobalToast } from "../GlobalToast";

export default function LoginModal({ isOpen, onClose, redirectTo = null }) {
  const { setUser, login, openRegisterModal, openForgotPasswordModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Đóng modal khi nhấn phím Escape & khóa cuộn trang nền
  useEffect(() => {
    if (!isOpen) return undefined;

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

  // Reset thông báo lỗi mỗi khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getRoleRedirectPath = (userData) => {
    const role = userData?.role || userData?.roles?.[0];
    if (role === "admin") return "/admin";
    if (role === "farm_staff") return "/farm/seasons";
    if (role === "sales") return "/sales/orders";
    return null; // Khách hàng ở lại trang hiện tại (hoặc về trang trước đó nếu từ /login)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setErrorMessage("");
    if (!form.email.trim() || !form.password) {
      setErrorMessage("Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await authApi.login({
        email: form.email.trim(),
        password: form.password,
        remember: form.remember,
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
        `Chào mừng ${userData?.name || "bạn"} quay trở lại XanhFarm!`,
        "success"
      );

      onClose();

      // Điều hướng nếu là nhân viên nội bộ hoặc đang đứng ở route /login
      const staffPath = getRoleRedirectPath(userData);
      if (staffPath) {
        navigate(staffPath, { replace: true });
      } else if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else if (location.pathname === "/login") {
        navigate("/", { replace: true });
      }
    } catch (err) {
      const fieldErrors = err?.fieldErrors ?? err?.response?.data?.errors ?? {};
      const firstFieldError = Object.values(fieldErrors).flat()[0];
      setErrorMessage(
        firstFieldError ||
        err?.message ||
        err?.response?.data?.message ||
        "Thông tin đăng nhập không chính xác. Vui lòng kiểm tra lại."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-2xs animate-in fade-in duration-150"
      onClick={() => !submitting && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white border border-[#e5e7eb] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng góc phải */}
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Đóng cửa sổ đăng nhập"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header thương hiệu */}
        <div className="bg-gradient-to-br from-[#00450d] to-[#0a661c] px-6 pt-7 pb-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-[11px] font-bold tracking-wide uppercase">
            <Leaf className="w-3.5 h-3.5" />
            <span>Nông Sản Sạch XanhFarm</span>
          </div>
          <h2 id="login-modal-title" className="text-xl font-black mt-3">
            Đăng nhập tài khoản
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            Đặt nông sản tươi sạch, theo dõi gói định kỳ và tích điểm ưu đãi.
          </p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="modal-login-email"
              className="block font-bold text-[#191c1b] mb-1.5"
            >
              Email hoặc Số điện thoại *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-login-email"
                type="text"
                autoFocus
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Nhập email hoặc số điện thoại"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="modal-login-password"
                className="font-bold text-[#191c1b]"
              >
                Mật khẩu *
              </label>
              <button
                type="button"
                onClick={() => openForgotPasswordModal()}
                className="text-[11px] font-semibold text-[#00450d] hover:underline cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="modal-login-password"
                type={showPassword ? "text" : "password"}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Nhập mật khẩu"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? "Đang xác thực..." : "Đăng nhập ngay"}</span>
          </button>

          <div className="pt-3 border-t border-slate-100 text-center text-[#5a6357]">
            Chưa có tài khoản XanhFarm?{" "}
            <button
              type="button"
              onClick={() => {
                if (location.pathname === "/login") {
                  navigate("/register", {
                    replace: true,
                    state: location.state,
                  });
                  return;
                }
                openRegisterModal(redirectTo);
              }}
              className="font-bold text-[#00450d] hover:underline cursor-pointer"
            >
              Đăng ký ngay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}