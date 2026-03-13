const express = require("express");
const router = express.Router();

// Import TẤT CẢ các hàm controller
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  increaseStock,
} = require("../controllers/product.controller");

// GET ALL (dùng controller mới có pagination + search)
router.get("/", getAllProducts);

// GET BY ID
router.get("/:id", getProductById);

// CREATE
router.post("/", createProduct);

// UPDATE
router.put("/:id", updateProduct);

// DELETE
router.delete("/:id", deleteProduct);

// INCREASE STOCK (đã thêm)
router.patch("/increase-stock/:code", increaseStock);

module.exports = router;