/* Opens the shared login modal over the storefront for direct /login visits. */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomePage from "../public/HomePage";
import { useAuth } from "../../context/useAuth";

export default function LoginPage() {
  const { user, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const redirectTo = from
    ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}` || "/"
    : "/";

  useEffect(() => {
    if (user?.role === "farm_staff") {
      navigate("/farm/seasons", { replace: true });
    } else if (user?.role === "sales") {
      navigate("/sales/orders", { replace: true });
    } else if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else if (user) {
      navigate(redirectTo, { replace: true });
    } else {
      openLoginModal(redirectTo);
    }
  }, [user, navigate, redirectTo, openLoginModal]);

  return <HomePage />;
}