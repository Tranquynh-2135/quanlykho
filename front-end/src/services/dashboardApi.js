import axios from "axios";

const productBase = "http://localhost:4001";
const importBase = "http://localhost:4003";

export const dashboardApi = {
  // Thống kê tổng quát
  getStats: async () => {
    const [productsRes, importsRes] = await Promise.all([
      axios.get(`${productBase}/products`),
      axios.get(`${importBase}/imports`),
    ]);

    const products = productsRes.data.data || productsRes.data;
    const imports = importsRes.data.data || importsRes.data;

    // Tính toán
    const totalProducts = products.length;
    const lowStock = products.filter(
      (p) => p.stock <= (p.minStock || 10),
    ).length;

    // Phiếu nhập hôm nay
    const today = new Date().toISOString().split("T")[0];
    const todayImports = imports.filter(
      (imp) => imp.importDate && imp.importDate.split("T")[0] === today,
    ).length;

    return {
      totalProducts,
      lowStock,
      todayImports,
      totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0), // giá trị tồn kho theo giá bán
    };
  },

  // Lấy danh sách sản phẩm tồn thấp (top 5)
  getLowStockProducts: async (limit = 5) => {
    const res = await axios.get(`${productBase}/products`, {
      params: { minStock: 999999 }, // backend sẽ lọc stock <= minStock nếu đã hỗ trợ
    });
    return (res.data.data || res.data)
      .filter((p) => p.stock <= (p.minStock || 10))
      .slice(0, limit);
  },
};
