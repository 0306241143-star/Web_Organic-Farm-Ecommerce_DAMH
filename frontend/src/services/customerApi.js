/* ==========================================================================
 * CÁC HÀM GỌI API KHÁCH HÀNG (CUSTOMER API)
 * Bao gồm giỏ hàng, đặt mua lẻ, đăng ký gói định kỳ, ví điểm thưởng,
 * sổ địa chỉ nhận hàng và đổi mật khẩu tài khoản.
 * ========================================================================== */
import axiosClient, { postMultipart } from "./axiosClient";

export const customerApi = {
  // Thao tác giỏ hàng mua lẻ
  getCart: () => axiosClient.get("/customer/cart"),
  addCartItem: (data) => axiosClient.post("/customer/cart/items", data),
  updateCartItem: (productId, data) =>
    axiosClient.put(`/customer/cart/items/${productId}`, data),
  removeCartItem: (productId) =>
    axiosClient.delete(`/customer/cart/items/${productId}`),

  // Quản lý sổ địa chỉ giao hàng
  getAddresses: () => axiosClient.get("/customer/addresses"),
  createAddress: (data) => axiosClient.post("/customer/addresses", data),
  updateAddress: (id, data) => axiosClient.put(`/customer/addresses/${id}`, data),
  deleteAddress: (id) => axiosClient.delete(`/customer/addresses/${id}`),
  setDefaultAddress: (id) => axiosClient.patch(`/customer/addresses/${id}/default`),

  // Quản lý hồ sơ cá nhân & Đổi mật khẩu
  updateProfile: (data) => axiosClient.put("/customer/profile", data),
  changePassword: (data) => axiosClient.post("/customer/change-password", data),

  // Đặt hàng & Báo giá vận chuyển
  getCheckoutOptions: () => axiosClient.get("/customer/checkout/options"),
  getCheckoutQuote: (data) => axiosClient.post("/customer/checkout/quote", data),
  createRetailOrder: (data) => axiosClient.post("/customer/checkout/orders", data),
  getRetailOrderStatus: (orderId) => axiosClient.get(`/customer/checkout/orders/${orderId}`),
  cancelRetailOrder: (orderId) => axiosClient.post(`/customer/checkout/orders/${orderId}/cancel`),
  checkout: (data) => axiosClient.post("/customer/checkout", data),

  // Gói nông sản định kỳ
  createSubscription: (data) => axiosClient.post("/customer/subscriptions", data),
  getSubscriptionStatus: (subscriptionId) =>
    axiosClient.get(`/customer/subscriptions/${subscriptionId}`),
  checkoutSubscription: (subscriptionId) =>
    axiosClient.post(`/customer/subscriptions/${subscriptionId}/checkout`),
  cancelSubscription: (subscriptionId) =>
    axiosClient.post(`/customer/subscriptions/${subscriptionId}/cancel`),
  

  // Lịch sử đơn hàng, ví điểm & khiếu nại
  getOrders: (params) => axiosClient.get("/customer/orders", { params }),
  getOrder: (orderId) => axiosClient.get(`/customer/orders/${orderId}`),
  getSubscriptions: (params) => axiosClient.get("/customer/subscriptions", { params }),
  pauseSubscription: (subscriptionId) =>
    axiosClient.post(`/customer/subscriptions/${subscriptionId}/pause`),
  resumeSubscription: (subscriptionId) =>
    axiosClient.post(`/customer/subscriptions/${subscriptionId}/resume`),
  getRewardPoints: (params) => axiosClient.get("/customer/rewards", { params }),
  getClaims: (params) => axiosClient.get("/customer/claims", { params }),
  getClaim: (claimId) => axiosClient.get(`/customer/claims/${claimId}`),
  createClaim: (data) => postMultipart("/customer/claims", data),
};
