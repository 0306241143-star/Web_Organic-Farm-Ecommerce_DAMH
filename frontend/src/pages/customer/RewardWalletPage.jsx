/* ==========================================================================
 * TRANG TRUNG TÂM KHÁCH HÀNG (CUSTOMER ACCOUNT CENTER THEO CHUẨN SHOPEE)
 * Bao gồm:
 * 1. Hồ sơ của tôi (Thông tin cá nhân: Họ tên, Số điện thoại, Email)
 * 2. Sổ địa chỉ giao hàng (Danh sách thẻ địa chỉ, thiết lập mặc định, thêm/sửa/xóa)
 * 3. Đổi mật khẩu tài khoản (Bảo mật 3 lớp xác thực)
 * 4. Ví điểm thưởng & Lịch sử xu/điểm (Số dư, quy đổi, bộ lọc lịch sử)
 * ========================================================================== */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Award,
  MapPin,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Check,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Eye,
  EyeOff,
  User,
  Phone,
  Mail,
  Home,
  Package,
  Calendar,
  Coins,
  ShieldCheck,
  ShoppingBag,
  Camera,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { customerApi } from "../../services/customerApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import EmptyState from "../../components/common/EmptyState";

export default function RewardWalletPage() {
  const { user, setUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Xác định tab hiện tại từ query param: profile | address | password | rewards
  const tabParam = searchParams.get("tab");
  const getNormalizedTab = (param) => {
    if (param === "address") return "address";
    if (param === "password") return "password";
    if (param === "rewards") return "rewards";
    return "profile"; // Mặc định mở tab Hồ sơ cá nhân theo chuẩn Shopee
  };

  const [activeTab, setActiveTab] = useState(() => getNormalizedTab(tabParam));

  useEffect(() => {
    if (tabParam) {
      setActiveTab(getNormalizedTab(tabParam));
    }
  }, [tabParam]);

  const switchTab = (tabName) => {
    setActiveTab(tabName);
    setSearchParams({ tab: tabName }, { replace: true });
  };

  /* ==========================================================================
   * 1. NGHIỆP VỤ HỒ SƠ CÁ NHÂN (SHOPEE PROFILE: SỐ ĐIỆN THOẠI & EMAIL)
   * ========================================================================== */
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Quản lý ảnh đại diện (Avatar)
  const fileInputRef = useRef(null);
  const [avatar, setAvatar] = useState(() => {
    return user?.avatar || (user?.id ? localStorage.getItem(`user_avatar_${user.id}`) : null);
  });

  useEffect(() => {
    if (user) {
      const savedAvatar = user.avatar || (user.id ? localStorage.getItem(`user_avatar_${user.id}`) : null);
      if (savedAvatar) {
        setAvatar(savedAvatar);
      }
    }
  }, [user]);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showGlobalToast("Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp).", "warning");
      return;
    }

    if (file.size > 1024 * 1024) {
      showGlobalToast("Dung lượng ảnh tối đa là 1MB.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setAvatar(base64);
        if (setUser) {
          const updated = { ...user, avatar: base64 };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
          if (user?.id) {
            localStorage.setItem(`user_avatar_${user.id}`, base64);
          }
        }
        showGlobalToast("Cập nhật ảnh đại diện thành công.", "success");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar(null);
    if (setUser) {
      const updated = { ...user, avatar: null };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      if (user?.id) {
        localStorage.removeItem(`user_avatar_${user.id}`);
      }
    }
    showGlobalToast("Đã gỡ ảnh đại diện.", "success");
  };

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (profileSubmitting) return;

    if (!profileForm.name.trim()) {
      showGlobalToast("Vui lòng nhập họ và tên.", "warning");
      return;
    }
    if (!profileForm.phone.trim()) {
      showGlobalToast("Vui lòng nhập số điện thoại.", "warning");
      return;
    }
    if (!profileForm.email.trim()) {
      showGlobalToast("Vui lòng nhập địa chỉ email.", "warning");
      return;
    }

    setProfileSubmitting(true);
    try {
      const response = await customerApi.updateProfile({
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
      });
      const updatedUserData = response.data?.user;
      if (updatedUserData && setUser) {
        const mergedUser = {
          ...user,
          ...updatedUserData,
          permissions: user?.permissions || [],
        };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      }
      showGlobalToast("Cập nhật thông tin hồ sơ thành công.", "success");
    } catch (err) {
      showGlobalToast(err?.message || "Không thể cập nhật hồ sơ cá nhân.", "error");
    } finally {
      setProfileSubmitting(false);
    }
  };

  /* ==========================================================================
   * 2. NGHIỆP VỤ SỔ ĐỊA CHỈ NHẬN HÀNG (SHOPEE ADDRESS BOOK)
   * ========================================================================== */
  const [addresses, setAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    recipient_name: "",
    phone: "",
    detail_address: "",
    ward: "",
    district: "",
    province: "TP. Hồ Chí Minh",
    is_default: false,
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setAddressLoading(true);
    try {
      const response = await customerApi.getAddresses();
      setAddresses(response.data || []);
    } catch {
      showGlobalToast("Không thể tải danh sách địa chỉ giao hàng.", "error");
    } finally {
      setAddressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "address") {
      fetchAddresses();
    }
  }, [activeTab, fetchAddresses]);

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setAddressForm({
      recipient_name: user?.name || "",
      phone: user?.phone || "",
      detail_address: "",
      ward: "",
      district: "",
      province: "TP. Hồ Chí Minh",
      is_default: addresses.length === 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr) => {
    setEditingAddress(addr);
    setAddressForm({
      recipient_name: addr.recipient_name || "",
      phone: addr.phone || "",
      detail_address: addr.detail_address || "",
      ward: addr.ward || "",
      district: addr.district || "",
      province: addr.province || "TP. Hồ Chí Minh",
      is_default: Boolean(addr.is_default),
    });
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (addressSubmitting) return;

    if (!addressForm.recipient_name.trim()) {
      showGlobalToast("Vui lòng nhập họ và tên người nhận.", "warning");
      return;
    }
    if (!addressForm.phone.trim()) {
      showGlobalToast("Vui lòng nhập số điện thoại người nhận.", "warning");
      return;
    }
    if (!addressForm.detail_address.trim()) {
      showGlobalToast("Vui lòng nhập số nhà, tên đường cụ thể.", "warning");
      return;
    }
    if (!addressForm.ward.trim() || !addressForm.district.trim()) {
      showGlobalToast("Vui lòng nhập đầy đủ phường/xã và quận/huyện.", "warning");
      return;
    }

    setAddressSubmitting(true);
    try {
      if (editingAddress) {
        await customerApi.updateAddress(editingAddress.id, addressForm);
        showGlobalToast("Cập nhật địa chỉ nhận hàng thành công.", "success");
      } else {
        await customerApi.createAddress(addressForm);
        showGlobalToast("Thêm địa chỉ nhận hàng mới thành công.", "success");
      }
      setIsModalOpen(false);
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể lưu địa chỉ giao hàng.", "error");
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      await customerApi.setDefaultAddress(addrId);
      showGlobalToast("Đã thiết lập làm địa chỉ mặc định.", "success");
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể đặt địa chỉ mặc định.", "error");
    }
  };

  const handleDeleteAddress = async (addrId) => {
    const confirmed = await confirmGlobalDialog({
      title: "Xóa địa chỉ",
      message: "Bạn có chắc chắn muốn xóa địa chỉ nhận hàng này không?",
      confirmLabel: "Xóa",
      cancelLabel: "Hủy",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await customerApi.deleteAddress(addrId);
      showGlobalToast("Đã xóa địa chỉ thành công.", "success");
      fetchAddresses();
    } catch (err) {
      showGlobalToast(err?.message || "Không thể xóa địa chỉ.", "error");
    }
  };

  /* ==========================================================================
   * 3. NGHIỆP VỤ ĐỔI MẬT KHẨU (SHOPEE PASSWORD)
   * ========================================================================== */
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordSubmitting) return;

    if (!passwordForm.current_password) {
      showGlobalToast("Vui lòng nhập mật khẩu hiện tại.", "warning");
      return;
    }
    if (passwordForm.new_password.length < 8) {
      showGlobalToast("Mật khẩu mới phải có tối thiểu 8 ký tự.", "warning");
      return;
    }
    if (passwordForm.new_password !== passwordForm.new_password_confirmation) {
      showGlobalToast("Xác nhận mật khẩu mới không trùng khớp.", "warning");
      return;
    }

    setPasswordSubmitting(true);
    try {
      await customerApi.changePassword(passwordForm);
      showGlobalToast("Đổi mật khẩu tài khoản thành công.", "success");
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    } catch (err) {
      showGlobalToast(
        err?.message || "Mật khẩu hiện tại không chính xác. Vui lòng thử lại.",
        "error"
      );
    } finally {
      setPasswordSubmitting(false);
    }
  };

  /* ==========================================================================
   * 4. NGHIỆP VỤ VÍ ĐIỂM THƯỞNG (SHOPEE XU / REWARD POINTS)
   * ========================================================================== */
  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletHistoryMeta, setWalletHistoryMeta] = useState(null);
  const [walletHistoryLoadingMore, setWalletHistoryLoadingMore] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("all"); // all | earned | spent

  const fetchWallet = useCallback(async (page = 1, append = false) => {
    if (page === 1) setWalletLoading(true);
    try {
      const response = await customerApi.getRewardPoints({ page, per_page: 50 });
      setWalletData((current) => ({
        ...response.data,
        history: append
          ? [...(current?.history || []), ...(response.data?.history || [])]
          : (response.data?.history || []),
      }));
      setWalletHistoryMeta(response.meta?.history || null);
    } catch {
      showGlobalToast("Không thể tải thông tin ví điểm thưởng.", "error");
    } finally {
      if (page === 1) setWalletLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "rewards") {
      fetchWallet();
    }
  }, [activeTab, fetchWallet]);

  const filteredHistory = (walletData?.history || []).filter((item) => {
    if (historyFilter === "earned") return item.transaction_type === "Tich_diem" || item.transaction_type === "Hoan_diem";
    if (historyFilter === "spent") return item.transaction_type === "Su_dung";
    return true;
  });

  const loadMoreWalletHistory = async () => {
    if (!walletHistoryMeta || walletHistoryMeta.current_page >= walletHistoryMeta.last_page) return;
    setWalletHistoryLoadingMore(true);
    try {
      await fetchWallet(walletHistoryMeta.current_page + 1, true);
    } finally {
      setWalletHistoryLoadingMore(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* ================= KHUNG BỐ CỤC CHÍNH CHUẨN SHOPEE (SIDEBAR + MAIN) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
          {/* ================= CỘT TRÁI: SIDEBAR TÀI KHOẢN (SHOPEE STYLE) ================= */}
          <aside className="md:col-span-1 space-y-4">
            {/* Thẻ đại diện người dùng */}
            <div className="bg-white rounded-2xl p-4 border border-[#e5e7eb] flex items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#00450d] text-white flex items-center justify-center font-extrabold text-lg shrink-0 overflow-hidden border border-slate-200">
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (user?.name || user?.email || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div
                onClick={() => switchTab("profile")}
                className="truncate cursor-pointer group"
                title="Xem hồ sơ cá nhân"
              >
                <p className="text-sm font-bold text-[#191c1b] group-hover:text-[#00450d] truncate leading-tight transition-colors">
                  {user?.name || "Khách hàng"}
                </p>
                <p className="text-xs text-[#5a6357] truncate mt-0.5">
                  {user?.phone || "Chưa có số điện thoại"}
                </p>
                <p className="text-[11px] text-[#5a6357] truncate font-mono">
                  {user?.email || "—"}
                </p>
              </div>
            </div>

            {/* Menu điều hướng chức năng tài khoản */}
            <nav className="bg-white rounded-2xl border border-[#e5e7eb] p-2 shadow-2xs space-y-1">
              <button
                type="button"
                onClick={() => switchTab("profile")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${activeTab === "profile"
                  ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                  : "text-[#41493e] hover:bg-[#f3f4f6]"
                  }`}
              >
                <User className="w-4 h-4 text-[#00450d]" />
                <span>Hồ sơ của tôi</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("address")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${activeTab === "address"
                  ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                  : "text-[#41493e] hover:bg-[#f3f4f6]"
                  }`}
              >
                <MapPin className="w-4 h-4 text-[#00450d]" />
                <span>Địa chỉ nhận hàng</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("password")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${activeTab === "password"
                  ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                  : "text-[#41493e] hover:bg-[#f3f4f6]"
                  }`}
              >
                <Lock className="w-4 h-4 text-[#00450d]" />
                <span>Đổi mật khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab("rewards")}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${activeTab === "rewards"
                  ? "bg-[#00450d]/10 text-[#00450d] font-bold"
                  : "text-[#41493e] hover:bg-[#f3f4f6]"
                  }`}
              >
                <Coins className="w-4 h-4 text-[#00450d]" />
                <span>Ví điểm thưởng</span>
              </button>

              <div className="pt-2 my-1 border-t border-slate-100" />

              <Link
                to="/orders"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#41493e] hover:bg-[#f3f4f6] transition-colors"
              >
                <Package className="w-4 h-4 text-[#5a6357]" />
                <span>Đơn mua của tôi</span>
              </Link>

              <Link
                to="/subscriptions"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#41493e] hover:bg-[#f3f4f6] transition-colors"
              >
                <Calendar className="w-4 h-4 text-[#5a6357]" />
                <span>Gói rau định kỳ</span>
              </Link>

              <Link
                to="/cart"
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-[#41493e] hover:bg-[#f3f4f6] transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-[#5a6357]" />
                <span>Giỏ hàng nông sản</span>
              </Link>
            </nav>
          </aside>

          {/* ================= CỘT PHẢI: KHUNG NỘI DUNG CHÍNH (SHOPEE MAIN CONTAINER) ================= */}
          <main className="md:col-span-3 bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 shadow-xs min-h-[560px]">
            {/* ================= TAB 1: HỒ SƠ CỦA TÔI (SHOPEE PROFILE) ================= */}
            {activeTab === "profile" && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h1 className="text-lg font-bold text-[#191c1b]">Hồ Sơ Của Tôi</h1>
                  <p className="text-xs text-[#5a6357] mt-1">
                    Quản lý thông tin hồ sơ để bảo mật tài khoản
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Form thông tin bên trái: Đồng bộ border các trường Họ tên, Email, Số điện thoại */}
                  <form onSubmit={handleUpdateProfile} className="lg:col-span-2 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <label className="text-xs font-semibold text-[#5a6357] sm:text-right">
                        Họ và tên
                      </label>
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          required
                          value={profileForm.name}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, name: e.target.value })
                          }
                          placeholder="Nhập họ và tên"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <label className="text-xs font-semibold text-[#5a6357] sm:text-right">
                        Email
                      </label>
                      <div className="sm:col-span-3">
                        <input
                          type="email"
                          required
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, email: e.target.value })
                          }
                          placeholder="Nhập địa chỉ email"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <label className="text-xs font-semibold text-[#5a6357] sm:text-right">
                        Số điện thoại
                      </label>
                      <div className="sm:col-span-3">
                        <input
                          type="tel"
                          required
                          value={profileForm.phone}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, phone: e.target.value })
                          }
                          placeholder="Nhập số điện thoại"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-[#191c1b] focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                      <label className="text-xs font-semibold text-[#5a6357] sm:text-right">
                        Vai trò
                      </label>
                      <div className="sm:col-span-3">
                        <span className="text-xs font-semibold text-[#00450d]">
                          Khách hàng thân thiết XanhFarm
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4 pt-3">
                      <div className="hidden sm:block" />
                      <div className="sm:col-span-3">
                        <button
                          type="submit"
                          disabled={profileSubmitting}
                          className="px-6 py-2.5 rounded-xl bg-[#00450d] text-white text-xs font-bold hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                        >
                          {profileSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Cột hiển thị và tải lên ảnh đại diện chuẩn Shopee */}
                  <div className="lg:col-span-1 lg:border-l lg:border-slate-100 lg:pl-8 flex flex-col items-center justify-center text-center">
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-full bg-[#f2f4f2] border-2 border-[#00450d]/20 text-[#00450d] flex items-center justify-center font-black text-3xl shadow-inner overflow-hidden">
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (user?.name || user?.email || "U").charAt(0).toUpperCase()
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-[#00450d] text-white shadow-md hover:bg-[#006e1c] transition-all cursor-pointer"
                        title="Thay đổi ảnh đại diện"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-[#191c1b] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                      >
                        Chọn Ảnh
                      </button>

                      {avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                        >
                          Xóa ảnh hiện tại
                        </button>
                      )}

                      <div className="text-[11px] text-[#5a6357] leading-tight space-y-0.5 mt-1">
                        <p>Dung lượng file tối đa 1 MB</p>
                        <p>Định dạng: .JPEG, .PNG, .WEBP</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 2: ĐỊA CHỈ NHẬN HÀNG (SHOPEE ADDRESS BOOK) ================= */}
            {activeTab === "address" && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-bold text-[#191c1b]">Địa Chỉ Của Tôi</h1>
                    <p className="text-xs text-[#5a6357] mt-1">
                      Quản lý địa chỉ nhận hàng mua lẻ và giao gói định kỳ
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00450d] text-white font-bold text-xs hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer w-fit"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm địa chỉ mới</span>
                  </button>
                </div>

                {addressLoading ? (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <RefreshCw className="w-6 h-6 text-[#00450d] animate-spin" />
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      title="Chưa có địa chỉ nhận hàng"
                      message="Hãy thêm địa chỉ giao hàng để hệ thống tự động tính cước và giao nông sản tận nơi."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="py-5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        {/* Chi tiết người nhận & địa chỉ */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-[#191c1b]">
                              {addr.recipient_name}
                            </span>
                            <span className="text-xs text-slate-300">|</span>
                            <span className="text-xs text-[#5a6357] font-semibold">
                              {addr.phone}
                            </span>
                          </div>

                          <p className="text-xs text-[#41493e] leading-relaxed">
                            {addr.detail_address}
                          </p>
                          <p className="text-xs text-[#5a6357]">
                            {[addr.ward, addr.district, addr.province].filter(Boolean).join(", ")}
                          </p>

                          {addr.is_default && (
                            <div className="pt-1">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-bold text-[#00450d] border border-[#00450d] bg-[#00450d]/5">
                                Mặc định
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Nút hành động bên phải chuẩn Shopee */}
                        <div className="flex sm:flex-col items-end gap-2.5 shrink-0 text-right">
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(addr)}
                              className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              Cập nhật
                            </button>
                            {!addr.is_default && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="font-medium text-rose-600 hover:text-rose-800 cursor-pointer"
                              >
                                Xóa
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            disabled={addr.is_default}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${addr.is_default
                              ? "border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed"
                              : "border-slate-300 text-slate-700 hover:border-[#00450d] hover:text-[#00450d] bg-white"
                              }`}
                          >
                            Thiết lập mặc định
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ================= TAB 3: ĐỔI MẬT KHẨU (SHOPEE PASSWORD) ================= */}
            {activeTab === "password" && (
              <div className="max-w-xl">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h1 className="text-lg font-bold text-[#191c1b]">Đổi Mật Khẩu</h1>
                  <p className="text-xs text-[#5a6357] mt-1">
                    Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác
                  </p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#5a6357] mb-1.5">
                      Mật khẩu hiện tại *
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPass ? "text" : "password"}
                        required
                        value={passwordForm.current_password}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, current_password: e.target.value })
                        }
                        placeholder="Nhập mật khẩu đang sử dụng"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5a6357] mb-1.5">
                      Mật khẩu mới *
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? "text" : "password"}
                        required
                        value={passwordForm.new_password}
                        onChange={(e) =>
                          setPasswordForm({ ...passwordForm, new_password: e.target.value })
                        }
                        placeholder="Tối thiểu 8 ký tự"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#5a6357] mb-1.5">
                      Xác nhận mật khẩu mới *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.new_password_confirmation}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          new_password_confirmation: e.target.value,
                        })
                      }
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d] focus:ring-1 focus:ring-[#00450d]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-[#00450d] text-white text-xs font-bold hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                    >
                      {passwordSubmitting ? "Đang xử lý..." : "Xác nhận"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ================= TAB 4: VÍ ĐIỂM THƯỞNG (SHOPEE XU STYLE) ================= */}
            {activeTab === "rewards" && (
              <div>
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h1 className="text-lg font-bold text-[#191c1b]">Ví Điểm Thưởng XanhFarm</h1>
                  <p className="text-xs text-[#5a6357] mt-1">
                    Điểm tích lũy dùng để trừ trực tiếp vào tiền thanh toán đơn hàng
                  </p>
                </div>

                {walletLoading ? (
                  <div className="flex items-center justify-center min-h-[300px]">
                    <RefreshCw className="w-6 h-6 text-[#00450d] animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Thẻ xu lớn chuẩn Shopee Xu */}
                    <div className="rounded-2xl bg-gradient-to-r from-[#00450d] to-[#0a661c] text-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                          <Coins className="w-8 h-8" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-200 uppercase">
                            Số dư điểm hiện tại
                          </p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-extrabold tracking-tight">
                              {Number(walletData?.total_points || 0).toLocaleString("vi-VN")}
                            </span>
                            <span className="text-xs font-bold text-emerald-200">điểm</span>
                          </div>
                          <p className="text-xs text-white/90 mt-1 font-medium">
                            Tương đương:{" "}
                            <span className="font-bold text-amber-200">
                              {(Number(walletData?.total_points || 0) * Number(walletData?.conversion_rules?.point_to_vnd || 0)).toLocaleString("vi-VN")} VNĐ
                            </span>
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/products"
                        className="px-4 py-2 rounded-xl bg-white text-[#00450d] text-xs font-bold hover:bg-emerald-50 transition-colors shadow-2xs w-fit"
                      >
                        Mua sắm dùng điểm
                      </Link>
                    </div>

                    {/* Khung quy tắc tích điểm */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
                        <p className="font-bold text-[#00450d]">
                          1 điểm = {Number(walletData?.conversion_rules?.point_to_vnd || 0).toLocaleString("vi-VN")}đ
                        </p>
                        <p className="text-[#5a6357] mt-0.5">Khấu trừ trực tiếp vào đơn hàng</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
                        <p className="font-bold text-[#00450d]">Tích lũy tự động</p>
                        <p className="text-[#5a6357] mt-0.5">Khi đơn hàng giao thành công</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#f9fafb] border border-slate-200 text-xs">
                        <p className="font-bold text-[#00450d]">Hoàn điểm an tâm</p>
                        <p className="text-[#5a6357] mt-0.5">Hoàn lại điểm khi đơn hàng bị hủy</p>
                      </div>
                    </div>

                    {/* Bộ lọc lịch sử & danh sách lịch sử chuẩn Shopee Xu */}
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <h2 className="text-sm font-bold text-[#191c1b]">Lịch Sử Điểm</h2>

                        <div className="flex items-center gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setHistoryFilter("all")}
                            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "all"
                              ? "bg-[#00450d] text-white"
                              : "text-[#5a6357] hover:bg-slate-100"
                              }`}
                          >
                            Tất cả
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryFilter("earned")}
                            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "earned"
                              ? "bg-[#00450d] text-white"
                              : "text-[#5a6357] hover:bg-slate-100"
                              }`}
                          >
                            Đã nhận
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryFilter("spent")}
                            className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${historyFilter === "spent"
                              ? "bg-[#00450d] text-white"
                              : "text-[#5a6357] hover:bg-slate-100"
                              }`}
                          >
                            Đã dùng
                          </button>
                        </div>
                      </div>

                      {filteredHistory.length === 0 ? (
                        <div className="py-8">
                          <EmptyState
                            title="Chưa có lịch sử giao dịch"
                            message="Các hoạt động cộng, trừ điểm sẽ được lưu chi tiết tại đây."
                          />
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {filteredHistory.map((item) => {
                            const isPositive = Number(item.points) > 0;
                            return (
                              <div
                                key={item.id}
                                className="py-3.5 flex items-center justify-between gap-4 text-xs"
                              >
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-[#191c1b]">
                                    {item.description}
                                  </p>
                                  <div className="flex items-center gap-2 text-[11px] text-[#5a6357]">
                                    <span>{item.created_at || "—"}</span>
                                    {item.order_id && (
                                      <span>• Mã đơn: #{item.order_id}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`font-bold text-sm ${isPositive ? "text-[#00450d]" : "text-amber-800"
                                      }`}
                                  >
                                    {isPositive ? `+${item.points}` : item.points}
                                  </span>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {item.type_label}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {walletHistoryMeta && walletHistoryMeta.current_page < walletHistoryMeta.last_page && (
                        <button
                          type="button"
                          onClick={loadMoreWalletHistory}
                          disabled={walletHistoryLoadingMore}
                          className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-[#00450d] hover:bg-slate-50 disabled:opacity-60"
                        >
                          {walletHistoryLoadingMore ? "Đang tải..." : "Tải thêm lịch sử"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* ================= MODAL THÊM / SỬA ĐỊA CHỈ (SHOPEE STYLE) ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#e5e7eb] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-[#191c1b] mb-4 pb-2 border-b border-slate-100">
              {editingAddress ? "Cập Nhật Địa Chỉ" : "Địa Chỉ Mới"}
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.recipient_name}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, recipient_name: e.target.value })
                    }
                    placeholder="Họ và tên người nhận"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, phone: e.target.value })
                    }
                    placeholder="Số điện thoại người nhận"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Tỉnh / Thành phố *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.province}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, province: e.target.value })
                    }
                    placeholder="TP. Hồ Chí Minh"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Quận / Huyện *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.district}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, district: e.target.value })
                    }
                    placeholder="Quận 1"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                    Phường / Xã *
                  </label>
                  <input
                    type="text"
                    required
                    value={addressForm.ward}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, ward: e.target.value })
                    }
                    placeholder="Phường Bến Nghé"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5a6357] mb-1">
                  Địa chỉ cụ thể *
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.detail_address}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, detail_address: e.target.value })
                  }
                  placeholder="Số nhà, tên tòa nhà, tên đường"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-[#00450d]"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, is_default: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-[#00450d] focus:ring-[#00450d]"
                  />
                  <span className="text-xs text-[#41493e] font-semibold">
                    Đặt làm địa chỉ mặc định
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-[#41493e] hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Trở lại
                </button>
                <button
                  type="submit"
                  disabled={addressSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#00450d] text-white text-xs font-bold hover:bg-[#006e1c] transition-colors shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  {addressSubmitting ? "Đang lưu..." : "Hoàn thành"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
