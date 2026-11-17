/* API calls for Admin reports, user accounts, and system settings. */
import axiosClient from "./axiosClient";

let dashboardMetricsCache = null;

export const adminApi = {
  // Báo cáo tổng quan dashboard
  getDashboardMetrics: async (force = false) => {
    if (!force && dashboardMetricsCache) {
      return dashboardMetricsCache;
    }
    const res = await axiosClient.get("/admin/reports/dashboard");
    dashboardMetricsCache = res;
    return res;
  },

  // Quản lý người dùng & phân quyền
  getUsers: (params) => axiosClient.get("/admin/users", { params }),
  updateUserStatus: (userId, status) =>
    axiosClient.put(`/admin/users/${userId}/status`, { status }),

  // Cấu hình hệ thống
  getSettings: () => axiosClient.get("/admin/settings"),
  updateSettings: (data) => axiosClient.put("/admin/settings", data),
};
