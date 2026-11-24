import { Outlet, useLocation, useNavigate } from "react-router-dom";
import LoginModal from "../components/auth/LoginModal";
import RegisterModal from "../components/auth/RegisterModal";
import StorefrontFooter from "../components/navigation/StorefrontFooter";
import StorefrontHeader from "../components/navigation/StorefrontHeader";
import ForgotPasswordModal from "../components/auth/ForgotPasswordModal";
import { useAuth } from "../context/useAuth";

export default function StorefrontLayout() {
  const {
    isLoginModalOpen,
    loginRedirectTo,
    closeLoginModal,
    isRegisterModalOpen,
    registerRedirectTo,
    closeRegisterModal,
    isForgotPasswordModalOpen,
    closeForgotPasswordModal,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleCloseLoginModal = () => {
    closeLoginModal();
    if (location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  };

  const handleCloseRegisterModal = () => {
    closeRegisterModal();
    if (location.pathname === "/register") {
      navigate("/", { replace: true });
    }
  };

  const handleCloseForgotPasswordModal = () => {
    closeForgotPasswordModal();
    if (location.pathname === "/forgot-password") {
      navigate("/", { replace: true });
    }
  };

  const hideFooter =
    location.pathname === "/cart" ||
    location.pathname.startsWith("/cart/") ||
    location.pathname === "/checkout" ||
    location.pathname.startsWith("/checkout/");

  return (
    <div className="min-h-screen flex flex-col bg-[#f6f8f6] text-[#191c1b] selection:bg-[#91f78e] selection:text-[#00450d]">
      <StorefrontHeader />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      {!hideFooter && <StorefrontFooter />}

      <LoginModal
        isOpen={isLoginModalOpen}
        redirectTo={loginRedirectTo}
        onClose={handleCloseLoginModal}
      />
      <RegisterModal
        isOpen={isRegisterModalOpen}
        redirectTo={registerRedirectTo}
        onClose={handleCloseRegisterModal}
      />

      <ForgotPasswordModal
        isOpen={isForgotPasswordModalOpen}
        onClose={handleCloseForgotPasswordModal}
      />
    </div>
  );
}