/* Dashboard navigation sidebar with role-based menu isolation. */
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Award,
  BarChart3,
  Calendar,
  ChevronLeft,
  Headphones,
  LogOut,
  MapPin,
  PackageSearch,
  Receipt,
  Settings,
  Sprout,
  Trash2,
  Users,
  Warehouse,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { farmApi } from "../../services/farmApi";
import { adminApi } from "../../services/adminApi";

export default function DynamicSidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [farmAddress, setFarmAddress] = useState("Cơ sở #1 • Củ Chi, TP.HCM");

  useEffect(() => {
    if (user?.role === "farm_staff") {
      farmApi
        .getFarmInfo()
        .then((res) => {
          const data = res.data?.data;
          if (data?.address) {
            setFarmAddress(data.address);
          }
        })
        .catch(() => {});
    }

    const handleFarmUpdated = (e) => {
      if (e.detail?.address) {
        setFarmAddress(e.detail.address);
      }
    };

    window.addEventListener("farm-info-updated", handleFarmUpdated);
    return () => window.removeEventListener("farm-info-updated", handleFarmUpdated);
  }, [user?.role]);

  const getRoleConfig = () => {
    switch (user?.role) {
      case "farm_staff":
        return {
          portalBadge: "NỘI BỘ",
          sectionTitle: "QUẢN LÝ NÔNG TRẠI",
          statusPill: "Kỹ thuật Nông trại (Farm Staff)",
          defaultName: "Phạm Hoàng Kỹ Thuật (Farm Staff)",
          defaultEmail: "farm.kythuat@nongsansach.vn",
          menu: [
            {
              to: "/farm/seasons",
              label: "Mùa vụ & Canh tác",
              icon: Calendar,
            },
            {
              to: "/farm/batches",
              label: "Lô thu hoạch & QR",
              icon: Sprout,
            },
            {
              to: "/farm/certificates",
              label: "Chứng nhận VietGAP",
              icon: Award,
            },
            {
              to: "/farm/disposals",
              label: "Kiểm kho & Xuất hủy",
              icon: Trash2,
            },
          ],
        };
      case "sales":
        return {
          portalBadge: "NỘI BỘ",
          sectionTitle: "QUẢN LÝ BÁN HÀNG & CSKH",
          statusPill: "Nhân viên Bán hàng (Sales)",
          defaultName: "Trần Thị Thu Hà (Sales)",
          defaultEmail: "sales.ha@nongsansach.vn",
          menu: [
            {
              to: "/sales/orders",
              label: "Đơn hàng & Giao nhận",
              icon: Receipt,
            },
            {
              to: "/sales/inventory",
              label: "Quản lý kho FEFO",
              icon: Warehouse,
            },
            {
              to: "/sales/flash-sales",
              label: "Flash Sale cận hạn",
              icon: Zap,
            },
            {
              to: "/sales/claims",
              label: "Xử lý khiếu nại",
              icon: Headphones,
            },
          ],
        };
      case "admin":
        return {
          portalBadge: "NỘI BỘ",
          sectionTitle: "QUẢN TRỊ HỆ THỐNG",
          statusPill: "Quản trị viên (Admin)",
          defaultName: "Nguyễn Minh Quản Trị (Admin)",
          defaultEmail: "admin@nongsansach.vn",
          menu: [
            {
              to: "/admin",
              label: "Báo cáo thống kê",
              icon: BarChart3,
            },
            {
              to: "/admin/catalog",
              label: "Danh mục & Sản phẩm",
              icon: PackageSearch,
            },
            {
              to: "/admin/users",
              label: "Quản lý tài khoản",
              icon: Users,
            },
            {
              to: "/admin/settings",
              label: "Cấu hình hệ thống",
              icon: Settings,
            },
          ],
        };
      default:
        return {
          portalBadge: "NỘI BỘ",
          sectionTitle: "KHU VỰC QUẢN TRỊ",
          statusPill: "Nhân sự nội bộ",
          defaultName: "Nhân sự XanhFarm",
          defaultEmail: "nhansu@nongsansach.vn",
          menu: [],
        };
    }
  };

  const roleConfig = getRoleConfig();

  const getDashboardHome = () => {
    switch (user?.role) {
      case "farm_staff":
        return "/farm/seasons";
      case "sales":
        return "/sales/orders";
      case "admin":
        return "/admin";
      default:
        return "/admin";
    }
  };

  const displayName = user?.name || roleConfig.defaultName;
  const displayEmail = user?.email || roleConfig.defaultEmail;
  const initial = displayName.charAt(0).toUpperCase();

  // Tải trước mã nguồn JS chunk và dữ liệu khi người dùng rê chuột vào menu (Instant 0ms transition)
  const handlePrefetch = (to) => {
    switch (to) {
      case "/farm/seasons":
        import("../../pages/farm/SeasonManagePage").catch(() => {});
        farmApi.getSeasons().catch(() => {});
        farmApi.getFarmInfo().catch(() => {});
        break;
      case "/farm/batches":
        import("../../pages/farm/BatchHarvestPage").catch(() => {});
        break;
      case "/farm/certificates":
        import("../../pages/farm/CertificateManagePage").catch(() => {});
        break;
      case "/admin":
        import("../../pages/admin/AdminDashboardPage").catch(() => {});
        break;
      case "/admin/catalog":
        import("../../pages/admin/CatalogManagePage").catch(() => {});
        adminApi.getCategories?.().catch(() => {});
        adminApi.getProducts?.().catch(() => {});
        break;
      case "/admin/users":
        import("../../pages/admin/UserManagementPage").catch(() => {});
        break;
      case "/admin/settings":
        import("../../pages/admin/SystemSettingsPage").catch(() => {});
        break;
      case "/sales/orders":
        import("../../pages/sales/SalesOrderPage").catch(() => {});
        break;
      default:
        break;
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-4 bg-gradient-to-b from-[#012413] via-[#03301a] to-[#011d0e] text-white border-r border-[#0d5932]/50 shadow-2xl select-none">
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 -mr-1">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-emerald-500/15 shrink-0">
          <Link
            to={getDashboardHome()}
            onClick={onClose}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-[#022b15] shadow-md shadow-emerald-950/40 shrink-0 group-hover:scale-105 transition-transform">
              <Sprout className="w-5 h-5 text-[#022b15]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-[18px] text-white tracking-tight leading-none">
                  XanhFarm
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-[#86efac] border border-emerald-500/30 tracking-wider">
                  {roleConfig.portalBadge}
                </span>
              </div>
              <span className="text-[11px] text-emerald-300/80 font-medium leading-tight block mt-1 truncate max-w-[150px]">
                {farmAddress}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-300/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Thu gọn hoặc đóng menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.06] border border-white/10 shadow-inner transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#86efac] to-emerald-300 text-[#022b15] flex items-center justify-center font-black text-sm shrink-0 shadow-md">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[13px] text-white truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-emerald-300/70 truncate font-mono leading-tight mt-0.5">
                {displayEmail}
              </p>
            </div>
          </div>

          <div className="mt-2.5 px-2.5 py-1 rounded-xl bg-black/30 border border-emerald-500/25 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#86efac] animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-[#86efac] truncate tracking-wide">
              {roleConfig.statusPill}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Điều hướng quản trị nội bộ" className="space-y-1.5 pt-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/60 mb-2 font-mono">
            {roleConfig.sectionTitle}
          </p>

          {roleConfig.menu.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                onMouseEnter={() => handlePrefetch(item.to)}
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-[#86efac] text-[#04331a] font-extrabold shadow-md shadow-emerald-950/30 ring-1 ring-[#86efac]/50"
                    : "text-emerald-100/80 hover:bg-white/[0.08] hover:text-white font-semibold"
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 shrink-0 transition-transform group-hover:scale-105 ${
                    isActive ? "text-[#04331a]" : "text-emerald-300/70 group-hover:text-white"
                  }`}
                />
                <span className="text-[13px] leading-tight truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Docked Footer (Farm location & Logout) */}
      <div className="space-y-2 pt-3.5 border-t border-emerald-500/15 shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 border border-emerald-500/20 text-emerald-200/90 text-[11.5px] font-medium transition-colors hover:border-emerald-500/40"
          title={`Cơ sở nông trại: ${farmAddress}`}
        >
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#86efac]" />
          </div>
          <span className="truncate">{farmAddress}</span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-300/80 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-all text-[12.5px] font-bold text-left cursor-pointer active:scale-98"
        >
          <LogOut className="w-4 h-4 shrink-0 text-rose-300" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}