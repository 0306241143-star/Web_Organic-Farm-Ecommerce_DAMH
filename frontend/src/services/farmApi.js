/* API calls for farm seasons, logs, batches, and certificates. */
import axiosClient from "./axiosClient";

export const farmApi = {
  getSeasons: () => axiosClient.get("/farm/seasons"),
  createFarmingLog: (data) => axiosClient.post("/farm/farming-logs", data),
  getBatches: () => axiosClient.get("/farm/batches"),
  createBatch: (data) => axiosClient.post("/farm/batches", data),
  uploadCertificate: (data) =>
    axiosClient.post("/farm/certificates", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
