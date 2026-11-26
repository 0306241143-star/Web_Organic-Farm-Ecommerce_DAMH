/* API calls for order processing, FEFO inventory, delivery, and claims. */
import axiosClient from "./axiosClient";

export const salesApi = {
  getOrders: (params) => axiosClient.get("/sales/orders", { params }),
  confirmOrder: (orderId) => axiosClient.post(`/sales/orders/${orderId}/confirm`),
  confirmCodPayment: (orderId) =>
    axiosClient.post(`/sales/orders/${orderId}/confirm-cod-payment`),
  dispatchOrder: (orderId, data) =>
    axiosClient.post(`/sales/orders/${orderId}/delivery`, data),
  getInventory: (params) => axiosClient.get("/sales/inventory", { params }),
  getExpiringBatches: (params) =>
    axiosClient.get("/sales/expiring-batches", { params }),
  getFlashSales: (params) => axiosClient.get("/sales/flash-sales", { params }),
  createFlashSale: (data) => axiosClient.post("/sales/flash-sales", data),
  setFlashSaleEnabled: (campaignId, enabled) =>
    axiosClient.patch(`/sales/flash-sales/${campaignId}/status`, { enabled }),
  getClaims: (params) => axiosClient.get("/sales/claims", { params }),
  getClaim: (claimId) => axiosClient.get(`/sales/claims/${claimId}`),
  receiveClaim: (claimId) => axiosClient.patch(`/sales/claims/${claimId}/receive`),
  resolveClaim: (claimId, data) => axiosClient.post(`/sales/claims/${claimId}/resolve`, data),
  getOrder: (orderId) => axiosClient.get(`/sales/orders/${orderId}`),
};