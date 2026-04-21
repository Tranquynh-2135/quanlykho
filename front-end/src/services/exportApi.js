import axios from "axios";

const http = axios.create({ baseURL: "http://localhost:4002" });

export const exportApi = {
  getAll: () => http.get("/exports"),
  create: (data) => http.post("/exports", data),
  // delete: (id) => http.delete(`/exports/${id}`),
};
