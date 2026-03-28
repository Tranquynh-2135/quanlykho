const Export = require("../models/export.model");
const axios = require("axios");

const PRODUCT_SERVICE_URL = "http://localhost:4001";

// ====================== GET ALL ======================
const getAllExports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, customer, search } = req.query;

    const query = {};
    if (customer) query.customer = { $regex: customer, $options: "i" };

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { customer: { $regex: search, $options: "i" } },
      ];
    }

    const exports = await Export.find(query)
      .sort({ exportDate: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Export.countDocuments(query);

    res.json({
      success: true,
      data: exports,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ====================== CREATE EXPORT (GIẢM STOCK) ======================
const createExport = async (req, res, next) => {
  try {
    const { code, customer, items, notes } = req.body;

    let totalAmount = 0;

    const processedItems = items.map((item) => {
      const totalPrice = item.quantity * item.unitPrice;
      totalAmount += totalPrice;
      return { ...item, totalPrice };
    });

    const newExport = new Export({
      code,
      customer,
      items: processedItems,
      totalAmount,
      notes,
      status: "completed",
    });

    const savedExport = await newExport.save();

    // === GIẢM STOCK ===
    for (const item of processedItems) {
      try {
        await axios.patch(
          `${PRODUCT_SERVICE_URL}/products/decrease-stock/${item.productCode}`,
          {
            quantity: item.quantity,
          }
        );
      } catch (err) {
        console.error(
          `❌ Không giảm được stock cho ${item.productCode}:`,
          err.message
        );
      }
    }

    res.status(201).json({
      success: true,
      data: savedExport,
      message: "Xuất kho thành công và đã cập nhật tồn kho!",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAllExports, createExport };