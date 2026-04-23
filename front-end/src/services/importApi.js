import axios from "axios";

const http = axios.create({ baseURL: "http://localhost:4003" });

export const importApi = {
  getAll: (params) => http.get("/imports", { params }),
  create: (data) => http.post("/imports", data),
  delete: (id) => http.delete(`/imports/${id}`),
  getExportUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `http://localhost:4003/imports/export/excel${query ? `?${query}` : ""}`;
  },
};
