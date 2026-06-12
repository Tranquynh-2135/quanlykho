const Import = require("../models/import.model");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const axios = require("axios");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
const SUPPLIER_SERVICE_URL =
  process.env.SUPPLIER_SERVICE_URL || "http://localhost:4004";
const WAREHOUSE_SERVICE_URL =
  process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4005";

// ====================== GET ALL ======================
const getAllImports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, supplierId, warehouseId, search } = req.query;

    const query = {};

    // Phân quyền: Nhân viên kho chỉ thấy phiếu của kho mình quản lý
    if (req.user && req.user.role === "nhan_vien_kho") {
      query.warehouseId = req.user.warehouseId;
    } else {
      if (supplierId) query.supplierId = supplierId;
      if (warehouseId) query.warehouseId = warehouseId;
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    const imports = await Import.find(query)
      .sort({ importDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Import.countDocuments(query);

    res.json({
      success: true,
      data: imports,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CREATE IMPORT ======================
const createImport = async (req, res, next) => {
  try {
    const { supplierId, warehouseId, items, notes } = req.body;

    if (!supplierId || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: "supplierId và warehouseId là bắt buộc",
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Phải có ít nhất một sản phẩm",
      });
    }

    // Tự sinh mã phiếu
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeSuffix =
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");
    const randomPart = Math.floor(10 + Math.random() * 90);
    const code = `NH-${dateStr}-${timeSuffix}${randomPart}`;

    let totalAmount = 0;

    const processedItems = items.map((item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const totalPrice = qty * price;
      totalAmount += totalPrice;

      return {
        productCode: item.productCode,
        quantity: qty,
        unitPrice: price,
        unit: (item.unit || "").toString().trim(),
        totalPrice,
        warehouseId: warehouseId,
        manufacturingDate: item.manufacturingDate
          ? new Date(item.manufacturingDate)
          : null,
        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
      };
    });

    const newImport = new Import({
      code,
      supplierId,
      warehouseId,
      items: processedItems,
      totalAmount,
      notes: notes || "",
      status: "completed",
    });

    const savedImport = await newImport.save();

    // Chuẩn bị cấu hình axios để truyền Token sang product-service
    const authHeader = req.headers.authorization;
    const axiosConfig = authHeader
      ? { headers: { Authorization: authHeader } }
      : {};

    // === TĂNG STOCK ===
    // === TĂNG STOCK VỚI BATCH ===
    for (const item of processedItems) {
      try {
        const url = `${PRODUCT_SERVICE_URL}/products/increase-stock/${item.productCode}`;
        await axios.patch(
          url,
          {
            quantity: item.quantity,
            warehouseId: savedImport.warehouseId,
            unit: item.unit || "",
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
            costPrice: item.unitPrice, // Truyền giá vốn nhập vào
          },
          axiosConfig,
        );
      } catch (axiosErr) {
        console.error(
          `❌ Lỗi gọi Product Service tại URL: ${PRODUCT_SERVICE_URL}`,
        );
        console.error(
          `Chi tiết lỗi: ${axiosErr.response?.data?.message || axiosErr.message}`,
        );
        throw new Error(
          `Không thể cập nhật tồn kho cho sản phẩm ${item.productCode}. Vui lòng kiểm tra cấu hình PRODUCT_SERVICE_URL.`,
        );
      }

      console.log(
        `✅ Cập nhật stock thành công cho ${item.productCode} | Số lượng: ${item.quantity}`,
      );
    }

    res.status(201).json({
      success: true,
      data: savedImport,
      message: "Nhập kho thành công!",
      code: code,
    });
  } catch (err) {
    next(err);
  }
};
// ====================== DELETE IMPORT ======================
const deleteImport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const importDoc = await Import.findById(id);
    if (!importDoc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu nhập kho",
      });
    }

    // Trừ stock trước khi xóa phiếu
    for (const item of importDoc.items) {
      try {
        await axios.patch(
          `${PRODUCT_SERVICE_URL}/products/increase-stock/${item.productCode}`,
          {
            quantity: -item.quantity, // Trừ tồn kho
            warehouseId: importDoc.warehouseId,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
          }, // Trừ tồn kho chính xác theo lô
        );
      } catch (err) {
        console.error(`Không trừ được stock cho ${item.productCode}`);
      }
    }

    await Import.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Đã xóa phiếu nhập kho ${importDoc.code} và cập nhật tồn kho`,
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};

// ====================== EXPORT EXCEL ======================
const exportExcel = async (req, res, next) => {
  try {
    let { startDate, endDate, supplierId, warehouseId, productCode } =
      req.query;

    const query = {};

    // Lọc theo khoảng ngày
    if (startDate || endDate) {
      query.importDate = {};
      if (startDate) query.importDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.importDate.$lte = end;
      }
    }

    // Lọc theo NCC - Kiểm tra chuỗi hợp lệ trước khi gán vào query
    if (supplierId && supplierId !== "undefined" && supplierId.trim() !== "") {
      query.supplierId = supplierId.trim();
    }

    // Lọc theo kho - Đảm bảo lọc đúng ID
    if (
      warehouseId &&
      warehouseId !== "undefined" &&
      warehouseId.trim() !== ""
    ) {
      query.warehouseId = warehouseId.trim();
    }

    // Lọc theo mã sản phẩm (tìm các phiếu có chứa mã SP này)
    if (productCode) query["items.productCode"] = productCode;

    // Sử dụng .lean() để lấy toàn bộ trường từ DB kể cả khi chưa khai báo trong Schema
    const imports = await Import.find(query).sort({ importDate: -1 }).lean();

    // Lấy danh sách bổ trợ từ các service khác để map tên
    let supplierMap = {};
    let warehouseMap = {};
    let productMap = {};
    let categoryMap = {};

    try {
      const [supRes, whRes, prodRes, catRes] = await Promise.all([
        axios.get(`${SUPPLIER_SERVICE_URL}/suppliers`).catch((err) => {
          console.error("Supplier service error (4004):", err.message);
          return { data: { data: [] } };
        }),
        axios.get(`${WAREHOUSE_SERVICE_URL}/warehouses`).catch((err) => {
          console.error("Warehouse service error:", err.message);
          return { data: { data: [] } };
        }),
        axios.get(`${PRODUCT_SERVICE_URL}/products`).catch((err) => {
          console.error("Product service error:", err.message);
          return { data: { data: [] } };
        }),
        axios.get(`${PRODUCT_SERVICE_URL}/products/categories`).catch((err) => {
          console.error("Category service error:", err.message);
          return { data: { data: [] } };
        }),
      ]);

      const sups = supRes.data?.data || supRes.data || [];
      const whs = whRes.data?.data || whRes.data || [];
      const prods = prodRes.data?.data || prodRes.data || [];
      const cats = catRes.data?.data || catRes.data || [];

      // Xây dựng bản đồ ánh xạ (Mapping)
      if (Array.isArray(sups))
        sups.forEach(
          (s) =>
            (supplierMap[(s._id?.$oid || s._id || s.id)?.toString()] = s.name),
        );
      if (Array.isArray(whs))
        whs.forEach(
          (w) =>
            (warehouseMap[(w._id?.$oid || w._id || w.id)?.toString()] = w.name),
        );
      if (Array.isArray(cats))
        cats.forEach(
          (c) =>
            (categoryMap[(c._id?.$oid || c._id || c.id)?.toString()] = c.name),
        );
      if (Array.isArray(prods))
        prods.forEach((p) => {
          const catId = (
            p.categoryId?._id?.$oid ||
            p.categoryId?._id ||
            p.categoryId
          )?.toString();
          productMap[p.code] = {
            name: p.name,
            categoryName: categoryMap[catId] || "—",
            unit: p.unit,
          };
        });
    } catch (err) {
      console.error(
        `Lỗi khi lấy thông tin NCC/Kho từ service khác: ${err.message}. Đảm bảo các service đang chạy và trả về dữ liệu.`,
      );
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lịch sử nhập kho");

    // Định nghĩa các cột
    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Mã phiếu", key: "code", width: 25 },
      { header: "Ngày nhập", key: "importDate", width: 20 },
      { header: "Nhà cung cấp", key: "supplierName", width: 25 },
      { header: "Kho nhập", key: "warehouseName", width: 20 },
      { header: "Mã sản phẩm", key: "productCode", width: 15 },
      { header: "Tên sản phẩm", key: "productName", width: 25 },
      { header: "Danh mục", key: "categoryName", width: 20 },
      { header: "Số lượng", key: "quantity", width: 10 },
      { header: "Đơn vị tính", key: "unit", width: 12 },
      { header: "Đơn giá", key: "unitPrice", width: 15 },
      { header: "Thành tiền", key: "totalPrice", width: 15 },
      { header: "Ngày SX", key: "mfg", width: 15 },
      { header: "HSD", key: "exp", width: 15 },
      { header: "Ghi chú", key: "notes", width: 30 },
    ];

    // Định dạng Header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    let rowIndex = 1;
    imports.forEach((imp) => {
      imp.items.forEach((item) => {
        // Nếu có lọc theo productCode, chỉ export các dòng có mã SP đó
        if (productCode && item.productCode !== productCode) return;

        // Lấy ID và chuyển sang chuỗi hex để so khớp với map tên
        const sIdKey =
          (imp.supplierId?.$oid || imp.supplierId)?.toString() || "";
        const wIdKey =
          (imp.warehouseId?.$oid || imp.warehouseId)?.toString() || "";
        const pInfo = productMap[item.productCode] || {};

        const row = worksheet.addRow({
          stt: rowIndex++,
          code: imp.code,
          importDate: new Date(imp.importDate).toLocaleDateString("vi-VN"),
          supplierName: supplierMap[sIdKey] || sIdKey || "—",
          warehouseName: warehouseMap[wIdKey] || wIdKey || "—",
          productCode: item.productCode,
          productName: pInfo.name || "—",
          categoryName: pInfo.categoryName || "—",
          quantity: item.quantity,
          unit: item.unit || pInfo.unit || "—",
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          mfg: item.manufacturingDate
            ? new Date(item.manufacturingDate).toLocaleDateString("vi-VN")
            : "—",
          exp: item.expiryDate
            ? new Date(item.expiryDate).toLocaleDateString("vi-VN")
            : "—",
          notes: imp.notes || "",
        });

        // Căn lề số
        row.getCell("quantity").alignment = { horizontal: "center" };
        row.getCell("unitPrice").numFmt = "#,##0";
        row.getCell("totalPrice").numFmt = "#,##0";
      });
    });

    // Kẻ bảng
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    // Thiết lập header trả về file
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + `Bao_cao_nhap_kho_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllImports,
  createImport,
  deleteImport,
  exportExcel,
};
