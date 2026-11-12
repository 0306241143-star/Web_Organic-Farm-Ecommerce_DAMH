/* API calls for order processing, FEFO inventory, delivery, and claims. */
import axiosClient from "./axiosClient";

export const salesApi = {
  getOrders: () => axiosClient.get("/sales/orders"),
  getInventory: () => axiosClient.get("/sales/inventory"),
  getExpiringBatches: () => axiosClient.get("/sales/expiring-batches"),
  getClaims: () => axiosClient.get("/sales/claims"),
  resolveClaim: (claimId, data) => axiosClient.post(`/sales/claims/${claimId}/resolve`, data),
};
