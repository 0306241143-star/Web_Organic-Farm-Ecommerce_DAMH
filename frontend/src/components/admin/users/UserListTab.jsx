import React from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  Mail,
  Pencil,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Users,
  Loader2,
} from "lucide-react";

const ROLE_BADGE_STYLES = {
  1: "bg-purple-50 text-purple-800 border-purple-200",
  2: "bg-blue-50 text-blue-800 border-blue-200",
  3: "bg-emerald-50 text-emerald-800 border-emerald-200",
  4: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function UserListTab({
  users = [],
  loading = false,
  currentUserId = null,
  togglingUserId = null,
  pagination = { current_page: 1, last_page: 1, total: 0, per_page: 15 },
  onPageChange,
  onEditUser,
  onToggleStatus,
}) {
  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-2xs border border-slate-200/80 flex flex-col overflow-hidden">
      {loading ? (
        <div className="flex-1 px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">
            Đang tải danh sách tài khoản hệ thống...
          </p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex-1 px-5 py-10 sm:p-14 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            Không tìm thấy tài khoản nào
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Thử thay đổi bộ lọc vai trò, trạng thái hoặc bấm &ldquo;Tạo Tài Khoản Mới&rdquo; để thêm nhân sự.
          </p>
        </div>
      ) : (
        <>
          {/* GIAO DIỆN DESKTOP (TABLE) */}
          <div className="hidden md:block flex-1 min-h-0 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-2xs">
                <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-5">Tài Khoản & Liên Hệ</th>
                  <th className="py-3 px-4">Vai Trò Hệ Thống</th>
                  <th className="py-3 px-4">Phạm Vi Quyền</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {users.map((u) => {
                  const isActive = u.status === "Hoat_dong";
                  const isToggling = togglingUserId === u.id;
                  const isSelfOrRoot =
                    u.is_protected || Number(u.id) === Number(currentUserId);
                  const roleStyle =
                    ROLE_BADGE_STYLES[u.role_id] || ROLE_BADGE_STYLES[4];

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${
                        isActive ? "hover:bg-slate-50/70" : "bg-red-50/20 hover:bg-red-50/40"
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 truncate">
                                {u.name}
                              </span>
                              <span className="text-[10.5px] font-mono text-slate-400">
                                #{u.id}
                              </span>
                              {Number(u.id) === Number(currentUserId) && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span className="inline-flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                {u.email}
                              </span>
                              {u.phone && (
                                <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleStyle}`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>{u.role_label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-600 font-medium">
                          {u.permissions?.length || 0} quyền được cấp
                        </div>
                        {u.role_id === 3 && (
                          <div className="text-[10.5px] text-amber-700 flex items-center gap-1 mt-0.5 font-medium">
                            <ShieldAlert className="w-3 h-3 shrink-0" />
                            <span>Cô lập doanh thu & KH</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {isActive ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Lock className="w-3 h-3 text-red-600" />
                          )}
                          <span>{isActive ? "Hoạt động" : "Đã khóa"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditUser(u)}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Chỉnh sửa thông tin & vai trò"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isToggling || isSelfOrRoot}
                            onClick={() => onToggleStatus(u)}
                            title={
                              isSelfOrRoot
                                ? "Tài khoản quản trị được bảo vệ"
                                : isActive
                                ? "Khóa tài khoản này"
                                : "Mở khóa tài khoản này"
                            }
                            className={`p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isActive
                                ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {isToggling ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isActive ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* GIAO DIỆN MOBILE-FIRST (CARDS) */}
          <div className="md:hidden flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
            {users.map((u) => {
              const isActive = u.status === "Hoat_dong";
              const isToggling = togglingUserId === u.id;
              const isSelfOrRoot =
                u.is_protected || Number(u.id) === Number(currentUserId);
              const roleStyle =
                ROLE_BADGE_STYLES[u.role_id] || ROLE_BADGE_STYLES[4];

              return (
                <article
                  key={u.id}
                  className={`p-3.5 space-y-2.5 ${
                    isActive ? "" : "bg-red-50/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 border ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {getInitials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-bold text-sm text-slate-800 truncate">
                            {u.name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            #{u.id}
                          </span>
                          {Number(u.id) === Number(currentUserId) && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              Bạn
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {u.email}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        isActive
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      {isActive ? "Hoạt động" : "Đã khóa"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${roleStyle}`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      <span>{u.role_label}</span>
                    </span>
                    {u.phone && (
                      <span className="text-xs text-slate-500 font-medium tabular-nums">
                        <Phone className="w-3 h-3 inline mr-1 text-slate-400" />
                        {u.phone}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50/90 border border-slate-200/70 px-2.5 py-2 text-xs">
                    <span className="text-slate-600 font-medium">
                      {u.permissions?.length || 0} quyền được cấp
                    </span>
                    {u.role_id === 3 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-semibold">
                        <ShieldAlert className="w-3 h-3 shrink-0" />
                        Cô lập dữ liệu
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onEditUser(u)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>

                    <button
                      type="button"
                      disabled={isToggling || isSelfOrRoot}
                      onClick={() => onToggleStatus(u)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        isActive
                          ? "border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50"
                          : "border-emerald-200 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isActive ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Khóa</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* THANH PHÂN TRANG */}
          <div className="shrink-0 px-4 py-2.5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              Hiển thị <span className="font-bold text-slate-800">{users.length}</span> /{" "}
              <span className="font-bold text-slate-800">{pagination.total}</span> tài khoản
            </div>

            {pagination.last_page > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={pagination.current_page <= 1}
                  onClick={() => onPageChange(pagination.current_page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2.5 py-1 font-bold text-slate-800 tabular-nums">
                  Trang {pagination.current_page} / {pagination.last_page}
                </span>
                <button
                  type="button"
                  disabled={pagination.current_page >= pagination.last_page}
                  onClick={() => onPageChange(pagination.current_page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}