const Export = require("../models/export.model");
const axios = require("axios");

const PRODUCT_SERVICE_URL = "http://localhost:4001";

// ====================== GET ALL ======================
const getAllExports = async (req, res, next) => {
  try {
    const exports = await Export.find().sort({ createdAt: -1 });
    res.json({ success: true, data: exports });
  } catch (err) {
    next(err);
  }
};

// ====================== GET BY ID ======================
const getExportById = async (req, res, next) => {
  try {
    const exp = await Export.findById(req.params.id);
    if (!exp) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu xuất" });
    }
    res.json({ success: true, data: exp });
  } catch (err) {
    next(err);
  }
};

// ====================== CREATE EXPORT ======================
const createExport = async (req, res, next) => {
  try {
    const { recipient, recipientType, items, note } = req.body;

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
      return { ...item, quantity, totalPrice };
    });

    // --- TRỪ STOCK TẠI PRODUCT SERVICE ---
    for (const item of processedItems) {
      const pCode = item.productCode;
      if (!pCode) throw new Error("Mã sản phẩm (productCode) bị thiếu");

      console.log(
        `🚀 Gọi Product Service trừ kho: ${pCode} (-${item.quantity})`,
      );

      const resStock = await axios.patch(
        `${PRODUCT_SERVICE_URL}/products/increase-stock/${pCode}`,
        { quantity: -item.quantity },
      );

      if (!resStock.data.success) {
        throw new Error(`Lỗi trừ kho sản phẩm ${pCode}`);
      }
    }

    // --- LƯU PHIẾU XUẤT ---
    const newExport = new Export({
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
      message: "Tạo phiếu xuất kho và cập nhật kho thành công!",
    });
  } catch (err) {
    console.error("❌ Lỗi Create Export:", err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: err.response?.data?.message || err.message,
    });
  }
};

// Xuất các hàm theo cách chuẩn
module.exports = {
  getAllExports,
  getExportById,
  createExport,
};
