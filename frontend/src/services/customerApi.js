/* API calls for customer cart, checkout, subscriptions, orders, and claims. */
import axiosClient from "./axiosClient";

export const customerApi = {
  // Các thao tác cart nhận payload sản phẩm/số lượng; API xác định chủ giỏ bằng token.
  getCart: () => axiosClient.get("/customer/cart"),
  addCartItem: (data) => axiosClient.post("/customer/cart/items", data),
  updateCartItem: (productId, data) =>
    axiosClient.put(`/customer/cart/items/${productId}`, data),
  removeCartItem: (productId) =>
    axiosClient.delete(`/customer/cart/items/${productId}`),
  checkout: (data) => axiosClient.post("/customer/checkout", data),
  createSubscription: (data) => axiosClient.post("/customer/subscriptions", data),
  getOrders: () => axiosClient.get("/customer/orders"),
  getRewardPoints: () => axiosClient.get("/customer/rewards"),
  createClaim: (data) => axiosClient.post("/customer/claims", data),
};
