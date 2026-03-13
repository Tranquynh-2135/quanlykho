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

// ====================== CREATE IMPORT (tự động tăng stock) ======================
const createImport = async (req, res, next) => {
  try {
    const { code, supplier, items, notes } = req.body;

    // Tính totalAmount và totalPrice từng item
    let totalAmount = 0;
    const processedItems = items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return { ...item, totalPrice };
    });

    const newImport = new Import({
      code,
      supplier,
      items: processedItems,
      totalAmount,
      notes,
      status: "completed",
    });

    const savedImport = await newImport.save();

    // === TỰ ĐỘNG TĂNG STOCK Ở PRODUCT-SERVICE ===
    for (const item of processedItems) {
      try {
        await axios.patch(
          `${PRODUCT_SERVICE_URL}/products/increase-stock/${item.productCode}`,
          {
            quantity: item.quantity,
          },
        );
      } catch (err) {
        console.error(
          `Không tăng được stock cho ${item.productCode}:`,
          err.message,
        );
      }
    }

    res.status(201).json({
      success: true,
      data: savedImport,
      message: "Nhập kho thành công và đã cập nhật tồn kho!",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllImports, createImport };
