const express = require("express");
const router = express.Router();
const {
  getAllImports,
  createImport,
  deleteImport,
  exportExcel,
} = require("../controllers/import.controller");

router.get("/", getAllImports);
router.get("/export/excel", exportExcel);
router.post("/", createImport);
router.delete("/:id", deleteImport);

module.exports = router;
