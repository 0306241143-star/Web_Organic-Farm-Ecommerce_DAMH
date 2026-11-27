import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Loader2,
  Lock,
  Save,
  ShieldAlert,
  ShieldCheck,
  Square,
  Users,
} from "lucide-react";
import { adminApi } from "../../../services/adminApi";
import { showGlobalToast } from "../../GlobalToast";

export default function RolePermissionMatrixTab({
  roles = [],
  permissions = [],
  loading = false,
  onRolePermissionsUpdated,
}) {
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [draftPermissionIds, setDraftPermissionIds] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Tải và đánh dấu các quyền đang được gán cho vai trò được chọn.
    if (roles.length > 0 && !selectedRoleId) {
      // Mặc định mở vai trò Farm_Staff (3) hoặc Sales (2) để Admin dễ cấu hình
      const defaultRole = roles.find((r) => r.id === 3) || roles[0];
      setSelectedRoleId(defaultRole.id);
      setDraftPermissionIds(defaultRole.permission_ids || []);
    }
  }, [roles, selectedRoleId]);

  const activeRole = roles.find((r) => Number(r.id) === Number(selectedRoleId));

  const handleSelectRole = (role) => {
    // Chọn vai trò sẽ làm bộ quyền cần lưu thay đổi theo vai trò đó.
    setSelectedRoleId(role.id);
    setDraftPermissionIds(role.permission_ids || []);
  };

  const isForbiddenForActiveRole = (perm) => {
    if (!activeRole) return true;
    if (activeRole.is_locked_role) return true;
    // Quy tắc cứng: Farm_Staff (id = 3) không được cấp quyền xem doanh thu hoặc thông tin khách hàng
    if (Number(activeRole.id) === 3 && perm.is_sensitive_customer_or_revenue) {
      return true;
    }
    return false;
  };

  const togglePermission = (perm) => {
    if (isForbiddenForActiveRole(perm)) return;

    setDraftPermissionIds((prev) =>
      prev.includes(perm.id)
        ? prev.filter((id) => id !== perm.id)
        : [...prev, perm.id]
    );
  };

  const isDirty = (() => {
    if (!activeRole) return false;
    const orig = [...(activeRole.permission_ids || [])].sort((a, b) => a - b);
    const curr = [...draftPermissionIds].sort((a, b) => a - b);
    return JSON.stringify(orig) !== JSON.stringify(curr);
  })();

  const handleSavePermissions = async () => {
    if (!activeRole || activeRole.is_locked_role) return;
    setSaving(true);
    try {
      const res = await adminApi.updateRolePermissions(
        activeRole.id,
        draftPermissionIds
      );
      const updatedRole = res.data?.data ?? res.data;
      showGlobalToast(
        res.data?.message || `Đã lưu cấu hình quyền cho vai trò ${activeRole.label}.`
      );
      onRolePermissionsUpdated?.(updatedRole);
    } catch (err) {
      showGlobalToast(
        err?.response?.data?.message ||
          err?.message ||
          "Không thể lưu cấu hình phân quyền.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  // Gom nhóm quyền theo nghiệp vụ
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const group = perm.group || "Khác";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-14 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-xs text-slate-500 font-medium">
          Đang tải ma trận phân quyền hệ thống...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 overflow-hidden">
      {/* CỘT TRÁI (DESKTOP) / THANH CUỘN NGANG (MOBILE): CHỌN VAI TRÒ */}
      <div className="shrink-0 lg:w-80 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3 sm:p-4 flex flex-col gap-2 overflow-x-auto lg:overflow-y-auto">
        <div className="hidden lg:block pb-2 border-b border-slate-100">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Vai Trò Trong Hệ Thống
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Chọn vai trò để thiết lập giới hạn thao tác
          </p>
        </div>

        <div className="flex lg:flex-col gap-2">
          {roles.map((role) => {
            const selected = Number(role.id) === Number(selectedRoleId);
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleSelectRole(role)}
                className={`text-left p-3 rounded-xl border transition-all cursor-pointer shrink-0 lg:shrink min-w-[210px] lg:min-w-0 ${
                  selected
                    ? "bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-500/30"
                    : "bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs sm:text-sm font-bold ${
                      selected ? "text-[#064e2e]" : "text-slate-800"
                    }`}
                  >
                    {role.label}
                  </span>
                  {role.is_locked_role && (
                    <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {role.description}
                </p>
                <div className="flex items-center justify-between text-[10.5px] font-bold mt-2 pt-1.5 border-t border-slate-200/60 text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {role.users_count} tài khoản
                  </span>
                  <span className="text-emerald-700">
                    {role.permission_ids?.length || 0}/{permissions.length} quyền
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT MA TRẬN QUYỀN CỦA VAI TRÒ ĐANG CHỌN */}
      {activeRole && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
          {/* Header Vai trò */}
          <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/50 to-white">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-800">
                  Phân Quyền: {activeRole.label}
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeRole.description}
              </p>
            </div>

            {!activeRole.is_locked_role && (
              <button
                type="button"
                disabled={!isDirty || saving}
                onClick={handleSavePermissions}
                className="px-4 py-2 rounded-xl bg-[#064e2e] hover:bg-[#043821] disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Lưu Thay Đổi Quyền</span>
              </button>
            )}
          </div>

          {/* Banner cảnh báo quy tắc nghiệp vụ cô lập quyền */}
          {Number(activeRole.id) === 3 && (
            <div className="shrink-0 mx-4 sm:mx-6 mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Chính sách bảo mật cô lập dữ liệu:</span>{" "}
                Vai trò <strong>Farm Staff</strong> chỉ được thao tác trên nghiệp vụ canh tác, lô thu hoạch và kiểm kho. Các quyền xem báo cáo doanh thu, đơn hàng và thông tin khách hàng bị khóa tự động.
              </div>
            </div>
          )}

          {activeRole.is_locked_role && (
            <div className="shrink-0 mx-4 sm:mx-6 mt-3.5 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Vai trò <strong>Quản trị viên (Admin)</strong> mặc định sở hữu toàn bộ quyền quản trị hệ thống và không thể bị thu hồi.
              </span>
            </div>
          )}

          {/* Danh sách checkbox quyền theo từng phân hệ */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
            {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => (
              <div key={groupName} className="space-y-2.5">
                <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {groupName}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {groupPerms.map((perm) => {
                    const checked = draftPermissionIds.includes(perm.id);
                    const disabled = isForbiddenForActiveRole(perm);

                    return (
                      <div
                        key={perm.id}
                        onClick={() => togglePermission(perm)}
                        role="checkbox"
                        aria-checked={checked}
                        aria-disabled={disabled}
                        tabIndex={disabled ? -1 : 0}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            togglePermission(perm);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                          disabled
                            ? "bg-slate-50/80 border-slate-200/60 opacity-60 cursor-not-allowed"
                            : checked
                            ? "bg-emerald-50/60 border-emerald-400/80 cursor-pointer"
                            : "bg-white border-slate-200 hover:border-slate-300 cursor-pointer"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 leading-snug">
                            {perm.description}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-[10.5px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                              {perm.code}
                            </code>
                            {Number(activeRole.id) === 3 &&
                              perm.is_sensitive_customer_or_revenue && (
                                <span className="text-[10px] font-bold text-amber-700">
                                  Bị khóa với Farm Staff
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}