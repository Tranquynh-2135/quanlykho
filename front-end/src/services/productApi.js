import axios from "axios";

const BASE = "http://localhost:4001";
const http = axios.create({ baseURL: BASE });

export const productApi = {
  getAll:  (params)     => http.get("/products", { params }),
  getById: (id)         => http.get(`/products/${id}`),
  create:  (data)       => http.post("/products", data),
  update:  (id, data)   => http.put(`/products/${id}`, data),
  remove:  (id)         => http.delete(`/products/${id}`),
  uploadImage: (file) => {
    const form = new FormData();
    form.append("image", file);
    return http.post("/products/upload-image", form);
  },
  imageUrl: (hash) => hash ? `${BASE}/uploads/${hash}` : null,
};