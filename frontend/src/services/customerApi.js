/* API calls for customer cart, checkout, subscriptions, orders, and claims. */
import axiosClient from "./axiosClient";

export const customerApi = {
  getCart: () => axiosClient.get("/customer/cart"),
  updateCart: (data) => axiosClient.put("/customer/cart", data),
  addCartItem: (data) => axiosClient.post("/customer/cart/items", data),
  checkout: (data) => axiosClient.post("/customer/checkout", data),
  createSubscription: (data) => axiosClient.post("/customer/subscriptions", data),
  getOrders: () => axiosClient.get("/customer/orders"),
  getRewardPoints: () => axiosClient.get("/customer/rewards"),
  createClaim: (data) => axiosClient.post("/customer/claims", data),
};
