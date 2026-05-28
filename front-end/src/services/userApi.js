import axios from "axios";

const http = axios.create({
  baseURL: process.env.REACT_APP_USER_SERVICE_URL || "http://localhost:4006",
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

export const userApi = {
  getAll: (params) => http.get("/users", { params }),
  getById: (id) => http.get(`/users/${id}`),
  create: (data) => http.post("/users", data),
  update: (id, data) => http.put(`/users/${id}`, data),
  remove: (id) => http.delete(`/users/${id}`),
  changePassword: (id, newPassword) =>
    http.patch(`/users/${id}/change-password`, { password: newPassword }),

  login: (credentials) => http.post("/users/login", credentials),
};
