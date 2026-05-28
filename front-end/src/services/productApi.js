import axios from "axios";

const BASE =
  process.env.REACT_APP_PRODUCT_SERVICE_URL ||
  "https://product-service-production-08db.up.railway.app";
const http = axios.create({ baseURL: BASE });

// Thêm Interceptor để đính kèm Token từ localStorage (nếu có)
http.interceptors.request.use(
  (config) => {
    const user = JSON.parse(sessionStorage.getItem("user")); // Đổi sang sessionStorage
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Thêm Interceptor để xử lý lỗi phản hồi (hết hạn Token)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");

      // Xóa thông tin user khỏi localStorage
      sessionStorage.removeItem("user");

      // Chuyển hướng về trang login (dùng window.location để đảm bảo reset lại toàn bộ state ứng dụng)
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const productApi = {
  getAll: (params) => http.get("/products", { params }),
  getById: (id) => http.get(`/products/${id}`),
  create: (data) => http.post("/products", data),
  update: (id, data) => http.put(`/products/${id}`, data),
  remove: (id) => http.delete(`/products/${id}`),
  uploadImage: (file) => {
    const form = new FormData();
    form.append("image", file);
    return http.post("/products/upload-image", form);
  },
  imageUrl: (hash) => (hash ? `${BASE}/uploads/${hash}` : null),

  // ==================== CATEGORY ====================
  getAllCategories: () => http.get("/products/categories"), // ← SỬA Ở ĐÂY
  createCategory: (data) => http.post("/products/categories", data), // ← SỬA Ở ĐÂY
  updateCategory: (id, data) => http.put(`/products/categories/${id}`, data), // ← SỬA Ở ĐÂY
  deleteCategory: (id) => http.delete(`/products/categories/${id}`), // ← SỬA Ở ĐÂY
};
