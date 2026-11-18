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
  getAddresses: () => axiosClient.get("/customer/addresses"),
  getCheckoutOptions: () => axiosClient.get("/customer/checkout/options"),
  getCheckoutQuote: (data) => axiosClient.post("/customer/checkout/quote", data),
  createRetailOrder: (data) => axiosClient.post("/customer/checkout/orders", data),
  getRetailOrderStatus: (orderId) => axiosClient.get(`/customer/checkout/orders/${orderId}`),
  checkout: (data) => axiosClient.post("/customer/checkout", data),
  createSubscription: (data) => axiosClient.post("/customer/subscriptions", data),
  getOrders: () => axiosClient.get("/customer/orders"),
  getRewardPoints: () => axiosClient.get("/customer/rewards"),
  createClaim: (data) => axiosClient.post("/customer/claims", data),
};
