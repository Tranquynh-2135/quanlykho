import axios from "axios";

const http = axios.create({ baseURL: "http://localhost:4003" });

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

export const importApi = {
  getAll: (params) => http.get("/imports", { params }),
  create: (data) => http.post("/imports", data),
  delete: (id) => http.delete(`/imports/${id}`),
  getExportUrl: (params) => {
    const query = new URLSearchParams(params).toString();
    return `http://localhost:4003/imports/export/excel${query ? `?${query}` : ""}`;
  },
};
