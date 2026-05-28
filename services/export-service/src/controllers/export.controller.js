const Export = require("../models/export.model");
const ExcelJS = require("exceljs");
const axios = require("axios");

const PRODUCT_SERVICE_URL =
  process.env.PRODUCT_SERVICE_URL || "http://localhost:4001";
const WAREHOUSE_SERVICE_URL =
  process.env.WAREHOUSE_SERVICE_URL || "http://localhost:4005";

// ====================== GET ALL ======================
const getAllExports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [exports, total] = await Promise.all([
      Export.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Export.countDocuments(),
    ]);

    res.json({
      success: true,
      data: exports,
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

// ====================== GET BY ID ======================
const getExportById = async (req, res, next) => {
  try {
    const exp = await Export.findById(req.params.id);
    if (!exp) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu xuất",
      });
    }
    res.json({ success: true, data: exp });
  } catch (err) {
    next(err);
  }
};

// ====================== CREATE EXPORT ======================
const createExport = async (req, res, next) => {
  try {
    const { warehouseId, recipient, recipientType, items, note } = req.body;

    // Validation
    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId là bắt buộc",
      });
    }

    if (!recipient || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Người nhận và danh sách sản phẩm là bắt buộc",
      });
    }

    let totalAmount = 0;
    const processedItems = items.map((item) => {
      const quantity = Math.abs(Number(item.quantity));
      const totalPrice = quantity * (item.unitPrice || 0);
      totalAmount += totalPrice;

      return {
        productCode: item.productCode,
        quantity,
        unitPrice: Number(item.unitPrice || 0),
        unit: item.unit?.trim() || "",
        totalPrice,
        manufacturingDate: item.manufacturingDate,
        expiryDate: item.expiryDate,
      };
    });

    // Chuẩn bị cấu hình axios để truyền Token sang product-service
    const authHeader = req.headers.authorization;
    const axiosConfig = authHeader
      ? { headers: { Authorization: authHeader } }
      : {};

    // --- TRỪ STOCK THEO KHO CỤ THỂ ---
    for (const item of processedItems) {
      const pCode = item.productCode;
      if (!pCode) {
        throw new Error("Mã sản phẩm (productCode) bị thiếu");
      }

      console.log(
        `🚀 Trừ kho: ${pCode} (-${item.quantity}) tại kho ${warehouseId}`,
      );

      const resStock = await axios.patch(
        `${PRODUCT_SERVICE_URL}/products/increase-stock/${pCode}`,
        {
          quantity: -item.quantity,
          warehouseId: warehouseId,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
        },
        axiosConfig,
      );

      if (!resStock.data?.success) {
        throw new Error(`Lỗi trừ kho sản phẩm ${pCode}`);
      }
    }

    // --- LƯU PHIẾU XUẤT ---
    const newExport = new Export({
      warehouseId,
      recipient,
      recipientType: recipientType || "khach_hang",
      items: processedItems,
      totalAmount,
      note: note || "",
    });

    const savedExport = await newExport.save();

    return res.status(201).json({
      success: true,
      data: savedExport,
      message: "Tạo phiếu xuất kho thành công!",
      code: savedExport.code,
    });
  } catch (err) {
    console.error("❌ Lỗi Create Export:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message || "Lỗi server",
    });
  }
};

// ====================== DELETE EXPORT ======================
const deleteExport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exportDoc = await Export.findById(id);
    if (!exportDoc) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu xuất",
      });
    }

    // Hoàn lại tồn kho (trừ âm = cộng lại)
    for (const item of exportDoc.items) {
      try {
        await axios.patch(
          `${PRODUCT_SERVICE_URL}/products/increase-stock/${item.productCode}`,
          {
            quantity: item.quantity, // Truyền số dương để cộng lại
            warehouseId: exportDoc.warehouseId,
            manufacturingDate: item.manufacturingDate,
            expiryDate: item.expiryDate,
          },
        );
      } catch (err) {
        console.error(`Không hoàn kho được cho ${item.productCode}`);
      }
    }

    await Export.findByIdAndDelete(id);

    res.json({
      success: true,
      message: `Đã xóa phiếu xuất ${exportDoc.code} và hoàn lại tồn kho`,
      data: { id },
    });
  } catch (err) {
    next(err);
  }
};

// ====================== EXPORT EXCEL ======================
const exportExcel = async (req, res, next) => {
  try {
    let { startDate, endDate, warehouseId, recipientType } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (warehouseId) query.warehouseId = warehouseId;
    if (recipientType) query.recipientType = recipientType;

    const exportsData = await Export.find(query).sort({ createdAt: -1 }).lean();

    // Map dữ liệu Warehouse và Product để hiển thị tên thay vì ID
    let warehouseMap = {};
    let productMap = {};
    try {
      const [whRes, prodRes] = await Promise.all([
        axios
          .get(`${WAREHOUSE_SERVICE_URL}/warehouses`)
          .catch(() => ({ data: { data: [] } })),
        axios
          .get(`${PRODUCT_SERVICE_URL}/products`)
          .catch(() => ({ data: { data: [] } })),
      ]);

      const whs = whRes.data?.data || [];
      const prods = prodRes.data?.data || [];

      whs.forEach((w) => (warehouseMap[w._id.toString()] = w.name));
      prods.forEach((p) => {
        productMap[p.code] = { name: p.name, unit: p.unit };
      });
    } catch (err) {
      console.error("Lỗi lấy metadata cho excel:", err.message);
    }

    // Phẳng hóa dữ liệu (Flatten) để mỗi item là 1 dòng trong Excel
    const rows = [];
    exportsData.forEach((exp, idx) => {
      exp.items.forEach((item) => {
        rows.push({
          ...exp,
          stt: idx + 1,
          itemInfo: item,
          warehouseName: warehouseMap[exp.warehouseId] || exp.warehouseId,
        });
      });
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Lịch sử xuất kho");

    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Mã phiếu", key: "code", width: 20 },
      { header: "Ngày xuất", key: "exportDate", width: 15 },
      { header: "Kho xuất", key: "warehouseName", width: 20 },
      { header: "Người nhận", key: "recipient", width: 25 },
      { header: "Loại", key: "recipientType", width: 15 },
      { header: "Mã sản phẩm", key: "pCode", width: 15 },
      { header: "Tên sản phẩm", key: "pName", width: 25 },
      { header: "Số lượng", key: "qty", width: 10 },
      { header: "ĐVT", key: "unit", width: 10 },
      { header: "Đơn giá", key: "price", width: 15 },
      { header: "Thành tiền", key: "total", width: 15 },
      { header: "Tổng phiếu", key: "grandTotal", width: 15 },
      { header: "Ghi chú", key: "note", width: 25 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    rows.forEach((row) => {
      const r = worksheet.addRow({
        stt: row.stt,
        code: row.code,
        exportDate: new Date(row.createdAt).toLocaleDateString("vi-VN"),
        warehouseName: row.warehouseName,
        recipient: row.recipient,
        recipientType:
          row.recipientType === "khach_hang" ? "Khách hàng" : "Khác",
        pCode: row.itemInfo.productCode,
        pName: productMap[row.itemInfo.productCode]?.name || "—",
        qty: row.itemInfo.quantity,
        unit:
          row.itemInfo.unit ||
          productMap[row.itemInfo.productCode]?.unit ||
          "—",
        price: row.itemInfo.unitPrice,
        total: row.itemInfo.totalPrice,
        grandTotal: row.totalAmount,
        note: row.note,
      });
      r.getCell("price").numFmt = "#,##0";
      r.getCell("total").numFmt = "#,##0";
      r.getCell("grandTotal").numFmt = "#,##0";
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Bao_cao_xuat_kho_${Date.now()}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllExports,
  getExportById,
  createExport,
  deleteExport,
  exportExcel,
};
