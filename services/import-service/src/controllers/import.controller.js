const Import = require("../models/import.model");
const axios = require("axios");

const PRODUCT_SERVICE_URL = "http://localhost:4001";

// ====================== GET ALL ======================
const getAllImports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, supplier, search } = req.query;

    const query = {};
    if (supplier) query.supplier = { $regex: supplier, $options: "i" };
    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { supplier: { $regex: search, $options: "i" } },
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
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CREATE IMPORT  ======================
const createImport = async (req, res, next) => {
  try {
    const { supplierId, warehouseId, items, notes } = req.body;

    if (!supplierId || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: "supplierId và warehouseId là bắt buộc",
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
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return { ...item, totalPrice };
    });

    const newImport = new Import({
      code,
      supplierId,
      warehouseId,
      items: processedItems,
      totalAmount,
      notes,
      status: "completed",
    });

    const savedImport = await newImport.save();

    // Tăng stock...
    for (const item of processedItems) {
      try {
        await axios.patch(
          `http://localhost:4001/products/increase-stock/${item.productCode}`,
          {
            quantity: item.quantity,
          },
        );
      } catch (err) {
        console.error(err.message);
      }
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
          `http://localhost:4001/products/increase-stock/${item.productCode}`,
          { quantity: -item.quantity }, // Trừ tồn kho
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

module.exports = {
  getAllImports,
  createImport,
  deleteImport,
};
