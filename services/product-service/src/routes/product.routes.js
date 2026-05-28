const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { hashFileName } = require("../utils/product.hashFile");

const ctrl = require("../controllers/product.controller");
const categoryCtrl = require("../controllers/category.controller");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, hashFileName(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ====================== ROUTES ======================

// 1. ROUTES DANH MỤC
router.get("/categories", categoryCtrl.getAllCategories);
router.post("/categories", categoryCtrl.createCategory);
router.put("/categories/:id", categoryCtrl.updateCategory);
router.delete("/categories/:id", categoryCtrl.deleteCategory);

// 2. ROUTES PRODUCT
router.post("/upload-image", upload.single("image"), ctrl.uploadImage);
router.patch("/increase-stock/:code", ctrl.increaseStock);

router.get("/", ctrl.getAllProducts);
router.post("/", ctrl.createProduct);
router.get("/:id", ctrl.getProductById);
router.put("/:id", ctrl.updateProduct);
router.delete("/:id", ctrl.deleteProduct);

module.exports = router;
