import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:4006",
});

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
