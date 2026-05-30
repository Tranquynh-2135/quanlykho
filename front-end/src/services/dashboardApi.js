import axios from "axios";

const productBase =
  process.env.REACT_APP_PRODUCT_SERVICE_URL ||
  "https://product-service-production-08db.up.railway.app";
const importBase =
  process.env.REACT_APP_IMPORT_SERVICE_URL ||
  "https://import-service-production-1266.up.railway.app";

// Tạo instance có Interceptor hoặc sử dụng lại từ các service khác
const httpProduct = axios.create({ baseURL: productBase });
const httpImport = axios.create({ baseURL: importBase });

const addAuthToken = (config) => {
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
};

httpProduct.interceptors.request.use(addAuthToken);
httpImport.interceptors.request.use(addAuthToken);

export const dashboardApi = {
  // Thống kê tổng quát
  getStats: async () => {
    const [productsRes, importsRes] = await Promise.all([
      httpProduct.get("/products"),
      httpImport.get("/imports"),
    ]);

    const products = productsRes.data.data || productsRes.data;
    const imports = importsRes.data.data || importsRes.data;

    const calculateStock = (p) =>
      p.stocks?.reduce((sum, s) => sum + (s.quantity || 0), 0) || p.stock || 0;

    // Tính toán
    const totalProducts = products.length;
    const lowStock = products.filter((p) => {
      const stockValue = calculateStock(p);
      // Chỉ tính tồn thấp nếu sản phẩm thực sự đang có hàng trong kho
      return stockValue > 0 && stockValue <= (p.minStock || 10);
    }).length;

    // Phiếu nhập hôm nay
    const today = new Date().toISOString().split("T")[0];
    const todayImports = imports.filter(
      (imp) => imp.importDate && imp.importDate.split("T")[0] === today,
    ).length;

    return {
      totalProducts,
      lowStock,
      todayImports,
      totalValue: products.reduce(
        (sum, p) => sum + (p.price || 0) * calculateStock(p),
        0,
      ),
    };
  },

  // Lấy danh sách sản phẩm tồn thấp (top 5)
  getLowStockProducts: async (limit = 5) => {
    const res = await httpProduct.get("/products", { params: { limit: 1000 } });
    const calculateStock = (p) =>
      p.stocks?.reduce((sum, s) => sum + (s.quantity || 0), 0) || p.stock || 0;

    return (res.data?.data || res.data || [])
      .filter((p) => {
        const stockValue = calculateStock(p);
        // Loại bỏ các sản phẩm tồn bằng 0
        return stockValue > 0 && stockValue <= (p.minStock || 10);
      })
      .slice(0, limit);
  },
};
