/* Shared dashboard frame with persistent sidebar only (top header removed on desktop). */
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Sprout } from "lucide-react";
import DynamicSidebar from "../components/navigation/DynamicSidebar";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-[#f8faf8] text-[#191c1b] flex selection:bg-[#91f78e] selection:text-[#00450d]">
      {/* Thanh Sidebar cố định bên trái */}
      <DynamicSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Thanh mở Sidebar chỉ hiển thị trên màn hình Mobile/Tablet nhỏ */}
        <div className="lg:hidden shrink-0 bg-white border-b border-slate-200/80 h-13 flex items-center justify-between px-3.5">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[#00450d] hover:bg-emerald-50 font-bold text-xs transition-colors cursor-pointer"
            aria-label="Mở menu điều hướng"
          >
            <Menu className="w-5 h-5" />
            <span>Menu quản trị</span>
          </button>

          <div className="flex items-center gap-1.5 text-[#00450d] font-black text-sm">
            <Sprout className="w-4 h-4 text-emerald-600" />
            <span>XanhFarm</span>
          </div>
        </div>

        {/* Vùng nội dung chính cuộn độc lập, sát mép trên cùng */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}