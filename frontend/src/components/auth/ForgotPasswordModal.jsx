/* ==========================================================================
 * FORM NỔI QUÊN / CẬP NHẬT MẬT KHẨU (FORGOT & RESET PASSWORD MODAL)
 * Hiển thị dạng popup đồng bộ với LoginModal và RegisterModal.
 * ========================================================================== */
import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Leaf,
  Lock,
  Mail,
  Send,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { authApi } from "../../services/authApi";
import axiosClient from "../../services/axiosClient";
import { showGlobalToast } from "../GlobalToast";

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const { openLoginModal, openRegisterModal } = useAuth();

  // step = 1: Nhập email/SĐT gửi yêu cầu | step = 2: Nhập mã OTP/Token & mật khẩu mới
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Khóa cuộn trang nền và đóng bằng phím Escape
  useEffect(() => {
    if (!isOpen) return undefined;

    // Khóa cuộn trang nền khi form đặt lại mật khẩu đang mở.

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

  // Reset trạng thái mỗi khi mở lại modal
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setToken("");
      setPassword("");
      setPasswordConfirmation("");
      setErrorMessage("");
      setInfoMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const extractError = (err, fallback) => {
    const fieldErrors = err?.fieldErrors ?? err?.response?.data?.errors ?? {};
    const firstFieldError = Object.values(fieldErrors).flat()[0];
    return (
      firstFieldError ||
      err?.message ||
      err?.response?.data?.message ||
      fallback
    );
  };

  // Bước 1: Gửi yêu cầu cấp mã khôi phục mật khẩu
  const handleRequestCode = async (e) => {
    // Gửi thông tin đã chuẩn hoá để nhận mã xác thực.
    e.preventDefault();
    if (submitting) return;

    setErrorMessage("");
    setInfoMessage("");

    if (!email.trim()) {
      setErrorMessage("Vui lòng nhập email hoặc số điện thoại đã đăng ký.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { email: email.trim() };
      const res =
        typeof authApi?.forgotPassword === "function"
          ? await authApi.forgotPassword(payload)
          : await axiosClient.post("/auth/forgot-password", payload);

      const data = res?.data?.data ?? res?.data ?? {};
      // Nếu môi trường dev/test trả sẵn mã token thì tự điền hỗ trợ
      if (data?.reset_token || data?.token) {
        setToken(String(data.reset_token || data.token));
      }

      const msg =
        res?.data?.message ||
        "Đã gửi mã xác thực khôi phục mật khẩu. Vui lòng kiểm tra hộp thư của bạn.";
      setInfoMessage(msg);
      showGlobalToast("Đã gửi mã xác thực đặt lại mật khẩu!", "success");
      setStep(2);
    } catch (err) {
      setErrorMessage(
        extractError(err, "Không thể gửi yêu cầu khôi phục mật khẩu. Vui lòng kiểm tra lại email.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Bước 2: Xác nhận mã và cập nhật mật khẩu mới
  const handleResetPassword = async (e) => {
    // Xác thực mã và cập nhật mật khẩu mới tại từng bước.
    e.preventDefault();
    if (submitting) return;

    setErrorMessage("");
    setInfoMessage("");

    if (!token.trim()) {
      setErrorMessage("Vui lòng nhập mã xác thực (OTP / Token) đã nhận.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMessage("Xác nhận mật khẩu mới chưa trùng khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        email: email.trim(),
        token: token.trim(),
        password,
        password_confirmation: passwordConfirmation,
      };

      if (typeof authApi?.resetPassword === "function") {
        await authApi.resetPassword(payload);
      } else {
        await axiosClient.post("/auth/reset-password", payload);
      }

      showGlobalToast(
        "Cập nhật mật khẩu thành công! Vui lòng đăng nhập lại.",
        "success"
      );
      openLoginModal();
    } catch (err) {
      setErrorMessage(
        extractError(err, "Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.")
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
      aria-labelledby="forgot-password-modal-title"
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
          aria-label="Đóng cửa sổ cập nhật mật khẩu"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header thương hiệu đồng bộ với LoginModal & RegisterModal */}
        <div className="bg-gradient-to-br from-[#00450d] to-[#0a661c] px-6 pt-7 pb-6 text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-emerald-100 text-[11px] font-bold tracking-wide uppercase">
            <Leaf className="w-3.5 h-3.5" />
            <span>Nông Sản Sạch XanhFarm</span>
          </div>
          <h2 id="forgot-password-modal-title" className="text-xl font-black mt-3">
            {step === 1 ? "Quên mật khẩu" : "Cập nhật mật khẩu mới"}
          </h2>
          <p className="text-xs text-emerald-100/90 mt-1">
            {step === 1
              ? "Nhập email hoặc số điện thoại đã đăng ký để nhận mã xác thực khôi phục."
              : "Nhập mã xác thực và thiết lập mật khẩu mới cho tài khoản XanhFarm."}
          </p>
        </div>

        {/* Nội dung Form */}
        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="p-6 space-y-4 text-xs">
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
                htmlFor="modal-forgot-email"
                className="block font-bold text-[#191c1b] mb-1.5"
              >
                Email hoặc Số điện thoại *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-forgot-email"
                  type="text"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại tài khoản"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "Đang gửi mã..." : "Gửi mã xác thực"}</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-[11.5px]">
              <button
                type="button"
                onClick={() => openLoginModal()}
                className="inline-flex items-center gap-1 font-bold text-[#00450d] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại đăng nhập</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setStep(2);
                }}
                className="font-semibold text-[#5a6357] hover:text-[#00450d] hover:underline cursor-pointer"
              >
                Đã có mã xác thực?
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center text-[#5a6357]">
              Chưa có tài khoản XanhFarm?{" "}
              <button
                type="button"
                onClick={() => openRegisterModal()}
                className="font-bold text-[#00450d] hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="p-6 space-y-3.5 text-xs">
            {errorMessage && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {infoMessage && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{infoMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="modal-reset-email"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Email tài khoản *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reset-email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email tài khoản"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="modal-reset-token"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Mã xác thực (OTP / Token) *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reset-token"
                  type="text"
                  autoFocus
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Nhập mã xác thực nhận qua email"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="modal-reset-password"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Mật khẩu mới *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reset-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
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
            </div>

            <div>
              <label
                htmlFor="modal-reset-password-confirm"
                className="block font-bold text-[#191c1b] mb-1"
              >
                Xác nhận mật khẩu mới *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="modal-reset-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
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
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <KeyRound className="w-4 h-4" />
              <span>{submitting ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</span>
            </button>

            <div className="flex items-center justify-between pt-2 text-[11.5px]">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setStep(1);
                }}
                className="inline-flex items-center gap-1 font-semibold text-[#5a6357] hover:text-[#00450d] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Gửi lại mã</span>
              </button>

              <button
                type="button"
                onClick={() => openLoginModal()}
                className="font-bold text-[#00450d] hover:underline cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}