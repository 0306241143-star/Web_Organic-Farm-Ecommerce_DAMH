import { Camera, Eye, EyeOff } from "lucide-react";

export default function ProfileInfoTab({
  activeTab,
  user,
  profileForm,
  setProfileForm,
  profileSubmitting,
  handleUpdateProfile,
  avatar,
  fileInputRef,
  handleAvatarChange,
  handleRemoveAvatar,
  passwordForm,
  setPasswordForm,
  showCurrentPass,
  setShowCurrentPass,
  showNewPass,
  setShowNewPass,
  passwordSubmitting,
  handleChangePassword,
}) {
  return (
    <>
      {activeTab === "profile" && (
        <div>
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h1 className="text-lg font-bold text-[#191c1b]">Hồ Sơ Của Tôi</h1>
            <p className="text-xs text-[#5a6357] mt-1">
              Quản lý thông tin hồ sơ để bảo mật tài khoản
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
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
    </>
  );
}
