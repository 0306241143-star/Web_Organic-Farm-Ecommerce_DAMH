/* API calls for registration, authentication, and password recovery. */
import axiosClient from "./axiosClient";

export const authApi = {
  login: (credentials) => axiosClient.post("/login", credentials),
  register: (details) => axiosClient.post("/register", details),
  logout: () => axiosClient.post("/logout"),
  requestPasswordReset: (data) => axiosClient.post("/forgot-password", data),
  resetPassword: (data) => axiosClient.post("/reset-password", data),
};
