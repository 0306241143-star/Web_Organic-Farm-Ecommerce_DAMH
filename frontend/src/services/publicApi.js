/* Lớp gọi API công khai cho danh mục, sản phẩm, thương hiệu và truy xuất QR. */
import axiosClient from "./axiosClient";

const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();
const inflightRequests = new Map();

function cachedGet(key, fetcher) {
  const now = Date.now();
  const cached = memoryCache.get(key);
  // Trả kết quả trong bộ nhớ nếu chưa hết thời hạn cache.
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return Promise.resolve(cached.payload);
  }

  // Dùng chung một request đang chạy để tránh gọi API trùng cho cùng khóa.
  if (inflightRequests.has(key)) {
    return inflightRequests.get(key);
  }

  const request = fetcher()
    .then((response) => {
      memoryCache.set(key, { payload: response, timestamp: Date.now() });
      return response;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, request);
  return request;
}

const sanitizeParams = (params = {}) => {
  const cleaned = {};
  // Loại bỏ tham số rỗng và chuẩn hóa cờ bật thành giá trị API mong đợi.
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
  getCategories: () =>
    cachedGet("categories", () => axiosClient.get("/categories")),
  getProducts: (params = {}) => {
    const cleaned = sanitizeParams(params);
    const cacheKey = `products:${JSON.stringify(cleaned)}`;
    return cachedGet(cacheKey, () =>
      axiosClient.get("/products", { params: cleaned })
    );
  },
  getProduct: (productId) =>
    cachedGet(`product:${productId}`, () =>
      axiosClient.get(`/public/san-pham/${productId}`)
    ),
  getBrandStory: () => axiosClient.get("/brand-story"),
  getQrTrace: (code) => axiosClient.get(`/trace/${encodeURIComponent(code)}`),
};
