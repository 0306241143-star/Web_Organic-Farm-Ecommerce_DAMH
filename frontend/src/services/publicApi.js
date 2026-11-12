/* API calls for public catalog, brand, and traceability data. */
import axiosClient from "./axiosClient";

export const publicApi = {
  getCategories: () => axiosClient.get("/categories"),
  getProducts: (params) => axiosClient.get("/products", { params }),
  getProduct: (productId) => axiosClient.get(`/products/${productId}`),
  getBrandStory: () => axiosClient.get("/brand-story"),
  getQrTrace: (code) => axiosClient.get(`/trace/${code}`),
};
