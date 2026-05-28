import axios from "axios";
const http = axios.create({
  baseURL:
    process.env.REACT_APP_WAREHOUSE_SERVICE_URL || "http://localhost:4005",
});

// Thêm Interceptor để đính kèm Token
http.interceptors.request.use(
  (config) => {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
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

export const warehouseApi = {
  getAll: (params) => http.get("/warehouses", { params }),
  getById: (id) => http.get(`/warehouses/${id}`),
  create: (data) => http.post("/warehouses", data),
  update: (id, data) => http.put(`/warehouses/${id}`, data),
  remove: (id) => http.delete(`/warehouses/${id}`),
};
