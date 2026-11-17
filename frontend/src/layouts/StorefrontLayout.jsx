import { Navigate, Outlet } from "react-router-dom";
import StorefrontFooter from "../components/navigation/StorefrontFooter";
import StorefrontHeader from "../components/navigation/StorefrontHeader";
import { useAuth } from "../context/useAuth";

export default function StorefrontLayout() {
  const { user } = useAuth();

  if (user && ["farm_staff", "sales"].includes(user?.role)) {
    const targetDashboard =
      user.role === "farm_staff" ? "/farm/seasons" : "/sales/orders";
    return <Navigate to={targetDashboard} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf8] text-[#191c1b] selection:bg-[#91f78e] selection:text-[#00450d]">
      <StorefrontHeader />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}