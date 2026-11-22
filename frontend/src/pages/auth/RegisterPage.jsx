/* Opens the shared registration modal over the storefront for direct /register visits. */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomePage from "../public/HomePage";
import { useAuth } from "../../context/useAuth";

export default function RegisterPage() {
  const { user, openRegisterModal } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const redirectTo = from
    ? `${from.pathname || ""}${from.search || ""}${from.hash || ""}` || "/"
    : "/";

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    } else {
      openRegisterModal(redirectTo);
    }
  }, [user, navigate, redirectTo, openRegisterModal]);

  return <HomePage />;
}
