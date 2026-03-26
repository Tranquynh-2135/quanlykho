import axios from "axios";
const http = axios.create({ baseURL: "http://localhost:4005" });

export const warehouseApi = {
  getAll:  (params)     => http.get("/warehouses", { params }),
  getById: (id)         => http.get(`/warehouses/${id}`),
  create:  (data)       => http.post("/warehouses", data),
  update:  (id, data)   => http.put(`/warehouses/${id}`, data),
  remove:  (id)         => http.delete(`/warehouses/${id}`),
};