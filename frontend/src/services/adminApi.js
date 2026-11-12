/* API calls for administration, permissions, reports, and settings. */
import axiosClient from "./axiosClient";

export const adminApi = {
  getReport: () => axiosClient.get("/admin/reports"),
  getUsers: () => axiosClient.get("/admin/users"),
  updateUserPermissions: (userId, data) =>
    axiosClient.put(`/admin/users/${userId}/permissions`, data),
  getSettings: () => axiosClient.get("/admin/settings"),
  updateSettings: (data) => axiosClient.put("/admin/settings", data),
};
