import axios from "axios";

const http = axios.create({ baseURL: "http://localhost:4003" });

export const importApi = {
  getAll: (params) => http.get("/imports", { params }),
  create: (data) => http.post("/imports", data),
};
