const express = require("express");
const router = express.Router();
const { protect } = require("../midlewares/auth.midleware");
const user_activityController = require("../controllers/user_activity.controller");

router.post("/", protect, user_activityController.logActivity);

module.exports = router;
