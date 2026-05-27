const express = require("express");
const router = express.Router();
const {
  createExport,
  getAllExports,
  getExportById,
  deleteExport,
  exportExcel,
} = require("../controllers/export.controller");

router.post("/", createExport);
router.get("/export/excel", exportExcel);
router.get("/", getAllExports);
router.get("/:id", getExportById);
router.delete("/:id", deleteExport);

module.exports = router;
