/* Shared dashboard frame for farm staff, sales, and administrators. */
import { Outlet } from "react-router-dom";
import DynamicSidebar from "../components/navigation/DynamicSidebar";

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <DynamicSidebar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
