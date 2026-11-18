import axiosClient from "./axiosClient";

let categoriesCache = null;
let subscriptionsCache = null;

export const storefrontApi = {
  getCategories: async (force = false) => {
    if (!force && Array.isArray(categoriesCache) && categoriesCache.length > 0) {
      return categoriesCache;
    }
    const res = await axiosClient.get("/categories");
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];

    if (list.length > 0) {
      categoriesCache = list;
    }
    return list;
  },

  getProducts: async (params = {}) => {
    const res = await axiosClient.get("/products", { params });
    return res.data;
  },

  getActiveFlashSales: async () => {
    const res = await axiosClient.get("/flash-sales/active");
    return res.data?.data || null;
  },

  getSubscriptions: async (force = false) => {
    if (!force && Array.isArray(subscriptionsCache) && subscriptionsCache.length > 0) {
      return subscriptionsCache;
    }
    const res = await axiosClient.get("/subscriptions");
    const list = Array.isArray(res.data?.data)
      ? res.data.data
      : Array.isArray(res.data)
      ? res.data
      : [];

    if (list.length > 0) {
      subscriptionsCache = list;
    }
    return list;
  },
};