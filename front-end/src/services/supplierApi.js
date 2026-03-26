import axios from "axios";
const http = axios.create({ baseURL: "http://localhost:4004" });

export const supplierApi = {
  getAll:  (params)     => http.get("/suppliers", { params }),
  getById: (id)         => http.get(`/suppliers/${id}`),
  create:  (data)       => http.post("/suppliers", data),
  update:  (id, data)   => http.put(`/suppliers/${id}`, data),
  remove:  (id)         => http.delete(`/suppliers/${id}`),
};