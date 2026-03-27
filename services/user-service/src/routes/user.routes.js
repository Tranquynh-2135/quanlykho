const router = require("express").Router();
const ctrl   = require("../controllers/user.controller");

router.get("/",                  ctrl.getAll);
router.get("/:id",               ctrl.getById);
router.post("/",                 ctrl.create);
router.put("/:id",               ctrl.update);
router.patch("/:id/password",    ctrl.changePassword);
router.delete("/:id",            ctrl.remove);

module.exports = router;