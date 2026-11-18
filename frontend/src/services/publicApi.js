/* Lớp gọi API công khai cho danh mục, sản phẩm, thương hiệu và truy xuất QR. */
import axiosClient from "./axiosClient";

const sanitizeParams = (params = {}) => {
  const cleaned = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === false) {
      return;
    }
    cleaned[key] = value === true ? 1 : value;
  });
  return cleaned;
};

export function formatCurrencyVnd(amount) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "Đang cập nhật";
  return `${Math.round(numeric).toLocaleString("vi-VN")}đ`;
}

export const publicApi = {
  getCategories: () => axiosClient.get("/categories"),
  getProducts: (params = {}) =>
    axiosClient.get("/products", { params: sanitizeParams(params) }),
  getProduct: (productId) => axiosClient.get(`/products/${productId}`),
  getBrandStory: () => axiosClient.get("/brand-story"),
  getQrTrace: (code) => axiosClient.get(`/trace/${code}`),
};
