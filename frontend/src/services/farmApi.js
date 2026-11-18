/* API calls for farm seasons, logs, batches, and certificates. */
import axiosClient from "./axiosClient";

let farmInfoCache = null;
let farmProductsCache = null;
let farmSeasonsCache = null;

export const farmApi = {
  // Lấy dữ liệu mùa vụ tức thời từ cache bộ nhớ/localStorage/sessionStorage
  getCachedSeasons: () => {
    if (farmSeasonsCache?.data?.data) {
      return farmSeasonsCache.data.data;
    }
    try {
      const saved = localStorage.getItem("cached_farm_seasons") || sessionStorage.getItem("cached_farm_seasons");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  // Quản lý mùa vụ (Seasons)
  getSeasons: async (params, force = false) => {
    if (!force && !params && farmSeasonsCache) {
      return farmSeasonsCache;
    }
    const res = await axiosClient.get("/farm/seasons", { params });
    if (!params) {
      farmSeasonsCache = res;
      try {
        if (res?.data?.data) {
          localStorage.setItem("cached_farm_seasons", JSON.stringify(res.data.data));
          sessionStorage.setItem("cached_farm_seasons", JSON.stringify(res.data.data));
        }
      } catch {}
    }
    return res;
  },

  createSeason: async (data) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.post("/farm/seasons", data);
  },
  getSeasonDetail: (id) => axiosClient.get(`/farm/seasons/${id}`),
  updateSeason: async (id, data) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.put(`/farm/seasons/${id}`, data);
  },
  deleteSeason: async (id) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.delete(`/farm/seasons/${id}`);
  },

  // Quản lý lô canh tác trong mùa vụ (Plots)
  createPlot: async (seasonId, data) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.post(`/farm/seasons/${seasonId}/plots`, data);
  },
  updatePlot: async (seasonId, plotId, data) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.put(`/farm/seasons/${seasonId}/plots/${plotId}`, data);
  },
  deletePlot: async (seasonId, plotId) => {
    farmSeasonsCache = null;
    try {
      localStorage.removeItem("cached_farm_seasons");
      sessionStorage.removeItem("cached_farm_seasons");
    } catch {}
    return axiosClient.delete(`/farm/seasons/${seasonId}/plots/${plotId}`);
  },

  // Danh mục nông sản giống trồng (Cache client-side)
  getFarmProducts: async (force = false) => {
    if (!force && farmProductsCache) {
      return farmProductsCache;
    }
    const res = await axiosClient.get("/farm/products");
    farmProductsCache = res;
    return res;
  },

  // Thông tin & địa chỉ cơ sở nông trại (Cache client-side)
  getFarmInfo: async (force = false) => {
    if (!force && farmInfoCache) {
      return farmInfoCache;
    }
    const res = await axiosClient.get("/farm/info");
    farmInfoCache = res;
    return res;
  },
  updateFarmInfo: async (data) => {
    const res = await axiosClient.put("/farm/info", data);
    farmInfoCache = res;
    return res;
  },

  // Quản lý nhật ký canh tác (Farming Logs)
  getFarmingLogs: (params) => axiosClient.get("/farm/farming-logs", { params }),
  createFarmingLog: (formData) =>
    axiosClient.post("/farm/farming-logs", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteFarmingLog: (id) => axiosClient.delete(`/farm/farming-logs/${id}`),

  // Các API cho lô thu hoạch & chứng nhận
  getBatches: () => axiosClient.get("/farm/batches"),
  createBatch: (data) => axiosClient.post("/farm/batches", data),
  uploadCertificate: (data) =>
    axiosClient.post("/farm/certificates", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
