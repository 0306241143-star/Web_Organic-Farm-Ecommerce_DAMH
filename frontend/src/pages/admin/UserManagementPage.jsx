/* Admin user & role management page orchestrating Account List and Role-Permission Matrix. */
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { adminApi } from "../../services/adminApi";
import { showGlobalToast, confirmGlobalDialog } from "../../components/GlobalToast";
import UserListTab from "../../components/admin/users/UserListTab";
import RolePermissionMatrixTab from "../../components/admin/users/RolePermissionMatrixTab";
import UserPermissionModal from "../../components/admin/modals/UserPermissionModal";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "permissions" ? "permissions" : "users";

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    locked: 0,
    staff_count: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bộ lọc danh sách tài khoản
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal & trạng thái thao tác
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [togglingUserId, setTogglingUserId] = useState(null);

  // Debounce từ khóa tìm kiếm
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchRolesAndPermissions = useCallback(async () => {
    try {
      const res = await adminApi.getRolesAndPermissions();
      const payload = res.data?.data ?? res.data ?? {};
      setRoles(Array.isArray(payload.roles) ? payload.roles : []);
      setPermissions(Array.isArray(payload.permissions) ? payload.permissions : []);
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message || "Không thể tải danh mục vai trò & quyền.",
        "error"
      );
    }
  }, []);

  const fetchUsers = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        const res = await adminApi.getUsers({
          page,
          per_page: 15,
          role_id: roleFilter !== "ALL" ? roleFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          search: debouncedSearch || undefined,
        });

        const list = Array.isArray(res.data) ? res.data : [];
        const meta = res.meta ?? {};
        setUsers(list);
        setPagination({
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          per_page: meta.per_page || 15,
          total: meta.total ?? list.length,
        });
        if (meta.summary) {
          setSummary(meta.summary);
        }
      } catch (err) {
        showGlobalToast(
          err?.response?.data?.message || "Không thể tải danh sách tài khoản.",
          "error"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, roleFilter, statusFilter, debouncedSearch]
  );

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  useEffect(() => {
    fetchUsers(false);
  }, [fetchUsers]);

  const switchTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "permissions") next.set("tab", "permissions");
    else next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const handleUserSaved = () => {
    fetchUsers(true);
    fetchRolesAndPermissions();
  };

  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus =
      targetUser.status === "Hoat_dong" ? "Khoa" : "Hoat_dong";

    if (nextStatus === "Khoa") {
      const confirmed = await confirmGlobalDialog({
        title: "Khóa tài khoản người dùng?",
        message: `Tài khoản "${targetUser.name}" (${targetUser.email}) sẽ bị đăng xuất ngay lập tức và không thể truy cập hệ thống cho đến khi được mở khóa.`,
        confirmLabel: "Khóa Tài Khoản",
        variant: "danger",
      });
      if (!confirmed) return;
    }

    setTogglingUserId(targetUser.id);
    try {
      const res = await adminApi.updateUserStatus(targetUser.id, nextStatus);
      const updated = res.data?.data ?? res.data;
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? updated || { ...u, status: nextStatus } : u))
      );
      setSummary((prev) => ({
        ...prev,
        active:
          nextStatus === "Hoat_dong"
            ? prev.active + 1
            : Math.max(0, prev.active - 1),
        locked:
          nextStatus === "Khoa"
            ? prev.locked + 1
            : Math.max(0, prev.locked - 1),
      }));
      showGlobalToast(
        nextStatus === "Khoa"
          ? `Đã khóa tài khoản "${targetUser.name}".`
          : `Đã mở khóa tài khoản "${targetUser.name}".`
      );
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể thay đổi trạng thái tài khoản.",
        "error"
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleRolePermissionsUpdated = (updatedRole) => {
    if (!updatedRole?.id) return;
    setRoles((prev) =>
      prev.map((r) => (Number(r.id) === Number(updatedRole.id) ? updatedRole : r))
    );
    fetchUsers(true);
  };

  return (
    <div className="-mt-3.5 sm:-mt-6 lg:-mt-8 -mx-3.5 sm:-mx-6 lg:-mx-8 h-[calc(100dvh-3.25rem)] sm:h-[calc(100vh-3.25rem)] lg:h-screen flex flex-col overflow-hidden bg-[#f8faf8]">
      {/* KHỐI HEADER CỐ ĐỊNH PHÍA TRÊN */}
      <div className="relative shrink-0 z-30 bg-white border-b border-slate-200/90 shadow-2xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-2.5 space-y-2 sm:space-y-2.5">
          {/* Hàng 1: Tiêu đề + Nút Làm mới & Tạo tài khoản */}
          <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                <span className="shrink-0">Quản Trị Hệ Thống</span>
                <span className="text-slate-300 shrink-0">•</span>
                <span className="normal-case font-semibold text-emerald-800 truncate">
                  Nhân sự & bảo mật RBAC
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
                <h1 className="text-[15px] sm:text-lg font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" />
                  <span className="truncate">
                    {activeTab === "users"
                      ? "Quản Lý Tài Khoản Hệ Thống"
                      : "Thiết Lập Phân Quyền Theo Vai Trò"}
                  </span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  fetchUsers(true);
                  fetchRolesAndPermissions();
                }}
                disabled={refreshing}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Làm mới dữ liệu"
                aria-label="Làm mới dữ liệu"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin text-emerald-600" : ""
                  }`}
                />
              </button>

              {activeTab === "users" && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setIsModalOpen(true);
                  }}
                  aria-label="Tạo tài khoản mới"
                  className="px-3 sm:px-3.5 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] text-white font-bold text-xs sm:text-sm shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="sm:hidden">Thêm TK</span>
                  <span className="hidden sm:inline">Tạo Tài Khoản Mới</span>
                </button>
              )}
            </div>
          </div>

          {/* Hàng 2: Thanh chuyển Tab Tài khoản / Phân quyền */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5">
            <button
              type="button"
              onClick={() => switchTab("users")}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === "users"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="sm:hidden">Tài Khoản</span>
              <span className="hidden sm:inline">Danh Sách Tài Khoản</span>
              <span
                className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                  activeTab === "users"
                    ? "bg-white/25 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {summary.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => switchTab("permissions")}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTab === "permissions"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="sm:hidden">Phân Quyền</span>
              <span className="hidden sm:inline">Phân Quyền Vai Trò</span>
              <span
                className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                  activeTab === "permissions"
                    ? "bg-white/25 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                {roles.length}
              </span>
            </button>
          </div>

          {/* Hàng 3: Thanh lọc & Tìm kiếm (chỉ hiển thị ở Tab Danh Sách Tài Khoản) */}
          {activeTab === "users" && (
            <div className="pt-2 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1.5 overflow-x-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0 pb-0.5 lg:pb-0 shrink-0">
                {[
                  { id: "ALL", label: "Tất cả", count: summary.total },
                  { id: "Hoat_dong", label: "Hoạt động", count: summary.active },
                  { id: "Khoa", label: "Đã khóa", count: summary.locked },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      statusFilter === tab.id
                        ? "bg-[#064e2e] text-white shadow-2xs"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 rounded-full tabular-nums ${
                        statusFilter === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-600 border border-slate-200/80"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lọc vai trò + Tìm kiếm */}
              <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 lg:flex-1 lg:justify-end">
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Lọc theo vai trò"
                  className="w-full sm:w-48 px-3 py-2 sm:py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả vai trò ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm họ tên, email, SĐT..."
                    className="w-full pl-8 pr-7 py-2 sm:py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder:text-slate-400"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Xóa từ khóa tìm kiếm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VÙNG NỘI DUNG CHÍNH CUỘN ĐỘC LẬP */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4 min-h-full flex flex-col">
          {activeTab === "users" ? (
            <UserListTab
              users={users}
              loading={loading}
              currentUserId={currentUser?.id}
              togglingUserId={togglingUserId}
              pagination={pagination}
              onPageChange={setPage}
              onEditUser={(u) => {
                setEditingUser(u);
                setIsModalOpen(true);
              }}
              onToggleStatus={handleToggleUserStatus}
            />
          ) : (
            <RolePermissionMatrixTab
              roles={roles}
              permissions={permissions}
              loading={loading}
              onRolePermissionsUpdated={handleRolePermissionsUpdated}
            />
          )}
        </div>
      </div>

      {/* Modal Tạo / Cập nhật tài khoản */}
      <UserPermissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingUser={editingUser}
        roles={roles}
        onSaved={handleUserSaved}
      />
    </div>
  );
}