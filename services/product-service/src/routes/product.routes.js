const express          = require("express");
const router           = express.Router();
const multer           = require("multer");
const path             = require("path");
const { hashFileName } = require("../utils/product.hashFile");
const ctrl             = require("../controllers/product.controller");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename:    (req, file, cb) => cb(null, hashFileName(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error("Chỉ chấp nhận ảnh jpeg/jpg/png/webp"));
  },
});

router.post("/upload-image", upload.single("image"), ctrl.uploadImage);
router.get("/",       ctrl.getAllProducts);
router.post("/",      ctrl.createProduct);
router.get("/:id",    ctrl.getProductById);
router.put("/:id",    ctrl.updateProduct);
router.delete("/:id", ctrl.deleteProduct);

module.exports = router;