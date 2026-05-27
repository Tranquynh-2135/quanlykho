import axios from "axios";
const http = axios.create({ baseURL: "http://localhost:4004" });

// Thêm Interceptor để đính kèm Token
http.interceptors.request.use(
  (config) => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Xử lý tự động đăng xuất khi Token hết hạn
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem("user");
      window.location.href = "/login?expired=true";
    }
    return Promise.reject(error);
  },
);

export const supplierApi = {
  getAll: (params) => http.get("/suppliers", { params }),
  getById: (id) => http.get(`/suppliers/${id}`),
  create: (data) => http.post("/suppliers", data),
  update: (id, data) => http.put(`/suppliers/${id}`, data),
  remove: (id) => http.delete(`/suppliers/${id}`),
};
