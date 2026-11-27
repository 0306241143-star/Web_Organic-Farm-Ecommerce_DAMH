/* Các hàm gọi API đăng ký, xác thực phiên và khôi phục mật khẩu. */
import axiosClient from "./axiosClient";

export const authApi = {
  login: (credentials) => axiosClient.post("/login", credentials),
  register: (details) => axiosClient.post("/register", details),
  logout: () => axiosClient.post("/logout"),
  me: () => axiosClient.get("/user"),
  requestPasswordReset: (data) => axiosClient.post("/forgot-password", data),
  resetPassword: (data) => axiosClient.post("/reset-password", data),
};
