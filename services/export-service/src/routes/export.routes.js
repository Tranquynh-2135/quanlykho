const express = require("express");
const router = express.Router();

const {
  getAllExports,
  createExport,
} = require("../controllers/export.controller");

router.get("/", getAllExports);
router.post("/", createExport);

module.exports = router;