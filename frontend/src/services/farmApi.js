/* API calls for farm seasons, logs, batches, and certificates. */
import axiosClient from "./axiosClient";

export const farmApi = {
  // Quản lý mùa vụ (Seasons)
  getSeasons: (params) => axiosClient.get("/farm/seasons", { params }),
  createSeason: (data) => axiosClient.post("/farm/seasons", data),
  getSeasonDetail: (id) => axiosClient.get(`/farm/seasons/${id}`),
  updateSeason: (id, data) => axiosClient.put(`/farm/seasons/${id}`, data),
  deleteSeason: (id) => axiosClient.delete(`/farm/seasons/${id}`),

  // Quản lý lô canh tác trong mùa vụ (Plots)
  createPlot: (seasonId, data) => axiosClient.post(`/farm/seasons/${seasonId}/plots`, data),
  updatePlot: (seasonId, plotId, data) =>
    axiosClient.put(`/farm/seasons/${seasonId}/plots/${plotId}`, data),
  deletePlot: (seasonId, plotId) => axiosClient.delete(`/farm/seasons/${seasonId}/plots/${plotId}`),

  // Danh mục nông sản giống trồng
  getFarmProducts: () => axiosClient.get("/farm/products"),

  // Quản lý nhật ký canh tác (Farming Logs)
  getFarmingLogs: (params) => axiosClient.get("/farm/farming-logs", { params }),
  createFarmingLog: (formData) =>
    axiosClient.post("/farm/farming-logs", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteFarmingLog: (id) => axiosClient.delete(`/farm/farming-logs/${id}`),

  // Các API cho lô thu hoạch & chứng nhận (giai đoạn sau)
  getBatches: () => axiosClient.get("/farm/batches"),
  createBatch: (data) => axiosClient.post("/farm/batches", data),
  uploadCertificate: (data) =>
    axiosClient.post("/farm/certificates", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
