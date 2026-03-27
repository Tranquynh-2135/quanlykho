const express = require("express");
const router = express.Router();
const axios = require("axios");
const Export = require("../models/Export");

// CREATE EXPORT
router.post("/", async (req, res) => {
  try {
    const { productId, warehouseId, quantity, reason, note } = req.body;

    // 🔍 Lấy tồn kho
    const stockRes = await axios.get(
      `${process.env.WAREHOUSE_SERVICE_URL}/api/warehouses/current-stock`,
      {
        params: { productId, warehouseId }
      }
    );

    const currentStock = stockRes.data.quantity;

    if (quantity > currentStock) {
      return res.status(400).json({
        message: `Chỉ còn ${currentStock} sản phẩm`
      });
    }

    // 🔄 Trừ kho
    await axios.put(
      `${process.env.WAREHOUSE_SERVICE_URL}/api/warehouses/update-stock`,
      {
        productId,
        warehouseId,
        quantity: -quantity
      }
    );

    // 💾 Lưu
    const newExport = new Export({
      productId,
      warehouseId,
      quantity,
      reason,
      note
    });

    await newExport.save();

    res.status(201).json(newExport);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH + HISTORY
router.get("/", async (req, res) => {
  const { productId, warehouseId, reason, fromDate, toDate } = req.query;

  let filter = {};

  if (productId) filter.productId = productId;
  if (warehouseId) filter.warehouseId = warehouseId;
  if (reason) filter.reason = reason;

  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const data = await Export.find(filter).sort({ createdAt: -1 });

  res.json(data);
});

module.exports = router;