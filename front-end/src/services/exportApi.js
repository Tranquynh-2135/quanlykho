import axios from "axios";

const BASE =
  process.env.REACT_APP_EXPORT_SERVICE_URL ||
  "https://export-service-production-642f.up.railway.app";
const http = axios.create({ baseURL: BASE });

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

export const exportApi = {
  getAll: (params) => http.get("/exports", { params }),
  create: (data) => http.post("/exports", data),
  delete: (id) => http.delete(`/exports/${id}`),
  getExportUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `${BASE}/exports/export/excel${query ? `?${query}` : ""}`;
  },
};
