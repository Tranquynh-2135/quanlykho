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

// CREATE
router.post("/", createProduct);

// INCREASE STOCK 
router.patch("/increase-stock/:code", increaseStock);

// GET BY ID
router.get("/:id", getProductById);

// UPDATE
router.put("/:id", updateProduct);

// DELETE
router.delete("/:id", deleteProduct);



module.exports = router;
