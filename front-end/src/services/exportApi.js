import axios from "axios";

const http = axios.create({ baseURL: "http://localhost:4002" });

export const exportApi = {
  getAll: () => http.get("/exports"),
  create: (data) => http.post("/exports", data),
  delete: (id) => http.delete(`/exports/${id}`),
  getExportUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `http://localhost:4002/exports/export/excel${query ? `?${query}` : ""}`;
  },
};
