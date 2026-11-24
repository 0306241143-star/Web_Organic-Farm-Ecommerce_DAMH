import { Link, useLocation } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  Calendar,
  LayoutDashboard,
  LogOut,
  MapPin,
  Receipt,
  User,
} from "lucide-react";
import { useAuth } from "../../../context/useAuth";

export default function MobileNavDrawer({ isOpen, closeMenus, prefetchCatalog }) {
  const { user, logout, openLoginModal, openRegisterModal } = useAuth();
  const location = useLocation();
  const isInternalStaff = Boolean(
    user && ["admin", "farm_staff", "sales"].includes(user.role)
  );

  const isCurrentActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const getDashboardRedirect = () => {
    if (user?.role === "farm_staff") return "/farm/seasons";
    if (user?.role === "sales") return "/sales/orders";
    if (user?.role === "admin") return "/admin";
    return "/";
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden border-t border-[#c0c9bb]/30 bg-white px-4 pt-3 pb-6 shadow-lg animate-in fade-in duration-150">
      <div className="space-y-1">
        <Link
          to="/"
          onClick={closeMenus}
          className={`block px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            isCurrentActive("/")
              ? "bg-[#00450d] text-white"
              : "text-[#191c1b] hover:bg-[#f2f4f2]"
          }`}
        >
          Trang Chủ
        </Link>

        <Link
          to="/products"
          onClick={closeMenus}
          onMouseEnter={prefetchCatalog}
          className={`block px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            isCurrentActive("/products")
              ? "bg-[#00450d] text-white"
              : "text-[#191c1b] hover:bg-[#f2f4f2]"
          }`}
        >
          Nông Sản
        </Link>

        <Link
          to="/brand"
          onClick={closeMenus}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
            isCurrentActive("/brand")
              ? "bg-[#00450d] text-white"
              : "text-[#191c1b] hover:bg-[#f2f4f2]"
          }`}
        >
          <BadgeCheck className="w-4 h-4 text-[#006e1c]" />
          <span>Câu Chuyện &amp; Chứng Nhận</span>
        </Link>

        {(!user || user.role === "customer" || user.role === "admin") && (
          <Link
            to="/subscriptions"
            onClick={closeMenus}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
              isCurrentActive("/subscriptions")
                ? "bg-[#00450d] text-white"
                : "text-[#191c1b] hover:bg-[#f2f4f2]"
            }`}
          >
            <span>Gói Định Kỳ</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-[#86efac]/35 text-[#00450d] border border-[#86efac]/60">
              -20%
            </span>
          </Link>
        )}

        <a
          href="#lien-he"
          onClick={(event) => {
            event.preventDefault();
            closeMenus();
            const footerEl = document.querySelector("footer");
            if (footerEl) {
              footerEl.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="block px-3.5 py-2.5 rounded-xl text-[14px] font-semibold text-[#191c1b] hover:bg-[#f2f4f2] transition-colors"
        >
          Liên Hệ
        </a>
      </div>

      <div className="pt-4 mt-3 border-t border-[#c0c9bb]/20">
        {!user ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                closeMenus();
                openLoginModal();
              }}
              className="w-full text-center py-2.5 text-[13px] font-semibold text-[#00450d] bg-[#f2f4f2] rounded-xl cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => {
                closeMenus();
                openRegisterModal();
              }}
              className="w-full text-center py-2.5 text-[13px] font-semibold text-white bg-[#00450d] rounded-xl cursor-pointer"
            >
              Đăng ký
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2 bg-[#f2f4f2] rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#00450d] text-white flex items-center justify-center font-bold text-[13px] shrink-0 overflow-hidden border border-[#c0c9bb]/40">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user.name || user.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 truncate">
                <p className="text-[13px] font-bold text-[#191c1b] truncate">{user.name}</p>
                <p className="text-[11px] text-[#5a6357] truncate">{user.email}</p>
              </div>
            </div>
            {!isInternalStaff ? (
              <div className="space-y-1">
                <Link
                  to="/orders"
                  onClick={closeMenus}
                  className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-medium text-[#41493e] hover:bg-[#f2f4f2] rounded-lg"
                >
                  <Receipt className="w-4 h-4 text-[#5a6357]" />
                  Đơn hàng của tôi
                </Link>
                <Link
                  to="/subscriptions"
                  onClick={closeMenus}
                  className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-medium text-[#41493e] hover:bg-[#f2f4f2] rounded-lg"
                >
                  <Calendar className="w-4 h-4 text-[#5a6357]" />
                  Gói rau định kỳ
                </Link>
                <Link
                  to="/rewards?tab=rewards"
                  onClick={closeMenus}
                  className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-medium text-[#41493e] hover:bg-[#f2f4f2] rounded-lg"
                >
                  <Award className="w-4 h-4 text-[#5a6357]" />
                  Ví điểm thưởng
                </Link>
                <Link
                  to="/rewards?tab=address"
                  onClick={closeMenus}
                  className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-medium text-[#41493e] hover:bg-[#f2f4f2] rounded-lg"
                >
                  <MapPin className="w-4 h-4 text-[#5a6357]" />
                  Sổ địa chỉ giao hàng
                </Link>
                <Link
                  to="/rewards?tab=profile"
                  onClick={closeMenus}
                  className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-medium text-[#41493e] hover:bg-[#f2f4f2] rounded-lg"
                >
                  <User className="w-4 h-4 text-[#5a6357]" />
                  Hồ sơ &amp; Bảo mật
                </Link>
              </div>
            ) : (
              <Link
                to={getDashboardRedirect()}
                onClick={closeMenus}
                className="flex items-center gap-2 px-3 py-2 text-[13.5px] font-bold text-[#00450d] hover:bg-[#f2f4f2] rounded-lg"
              >
                <LayoutDashboard className="w-4 h-4 text-[#006e1c]" />
                Vào trang làm việc nội bộ
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                closeMenus();
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13.5px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
