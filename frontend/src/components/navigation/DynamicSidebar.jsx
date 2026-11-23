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
  Store,
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
          portalBadge: "FARM",
          sectionTitle: "QUẢN LÝ NÔNG TRẠI",
          statusPill: "Kỹ Sư Nông Trại",
          defaultName: "Phạm Hoàng Kỹ Thuật",
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
          portalBadge: "SALES",
          sectionTitle: "QUẢN LÝ BÁN HÀNG",
          statusPill: "Chuyên Viên Bán Hàng",
          defaultName: "Trần Thị Thu Hà",
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
          portalBadge: "ADMIN",
          sectionTitle: "QUẢN TRỊ HỆ THỐNG",
          statusPill: "Quản Trị Viên",
          defaultName: "Nguyễn Minh Quản Trị",
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
          statusPill: "Nhân Sự Nội Bộ",
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

  const rawName = user?.name || roleConfig.defaultName;
  const displayName = rawName
    .replace(/\s*\(Farm Staff\)/i, "")
    .replace(/\s*\(Sales\)/i, "")
    .replace(/\s*\(Admin\)/i, "")
    .trim();
  const initial = displayName.charAt(0).toUpperCase();

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
      case "/farm/disposals":
        import("../../pages/farm/InventoryWastagePage").catch(() => {});
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
    <div className="h-full flex flex-col justify-between p-4 bg-gradient-to-b from-[#021f11] via-[#042817] to-[#01170d] text-white border-r border-emerald-900/40 shadow-2xl select-none">
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 -mr-1 scrollbar-thin scrollbar-thumb-emerald-900/40 scrollbar-track-transparent">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15 shrink-0">
          <Link
            to={getDashboardHome()}
            onClick={onClose}
            className="flex items-center gap-2.5 group focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-all duration-200">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight leading-none">
                XanhFarm
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 tracking-wider">
                {roleConfig.portalBadge}
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-300/60 hover:text-white hover:bg-white/10 transition-colors lg:hidden cursor-pointer"
            aria-label="Đóng menu"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* User Profile Card */}
        <div className="p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-emerald-500/20 hover:border-emerald-500/35 shadow-inner transition-all duration-200">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-200 text-[#022b15] flex items-center justify-center font-black text-sm shadow-md">
                {initial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#021f11]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[13px] text-white truncate leading-tight">
                {displayName}
              </p>
              <p className="text-[11px] text-emerald-300/80 truncate font-semibold mt-0.5">
                {roleConfig.statusPill}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav aria-label="Điều hướng quản trị nội bộ" className="space-y-1.5 pt-1">
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-emerald-400/70 mb-2 font-mono">
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
                className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/25 via-emerald-500/15 to-transparent text-white font-bold border-l-[3px] border-l-emerald-400 border-y border-r border-emerald-500/15 shadow-sm shadow-emerald-950/40"
                    : "text-emerald-100/75 hover:bg-white/[0.05] hover:text-white border-l-[3px] border-l-transparent border-y border-r border-transparent font-medium"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 transition-all ${
                    isActive
                      ? "bg-emerald-500 text-[#022415] shadow-xs shadow-emerald-400/30"
                      : "bg-white/[0.05] text-emerald-300/80 group-hover:bg-emerald-500/20 group-hover:text-emerald-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                </div>
                <span className="text-[13px] leading-tight truncate">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Docked Footer (Farm location & Quick Actions) */}
      <div className="space-y-2 pt-3 border-t border-emerald-500/15 shrink-0">
        {user?.role === "farm_staff" && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/25 border border-emerald-500/20 text-emerald-200/90 text-xs font-medium transition-colors hover:border-emerald-500/35"
            title={farmAddress}
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{farmAddress}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Link
            to="/"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-emerald-300/80 hover:text-white hover:bg-white/[0.06] border border-white/5 hover:border-emerald-500/20 transition-all text-xs font-semibold cursor-pointer"
            title="Xem trang web cửa hàng"
          >
            <Store className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cửa hàng</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-rose-300/85 hover:text-rose-100 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition-all text-xs font-semibold cursor-pointer"
            title="Đăng xuất khỏi hệ thống"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Đăng xuất</span>
          </button>
        </div>
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
