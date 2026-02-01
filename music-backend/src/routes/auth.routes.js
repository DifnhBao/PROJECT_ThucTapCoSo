const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { protect } = require("../midlewares/auth.midleware");

// USER PAGE

//route for register
router.post("/register", authController.register);

//route for login
router.post("/login", authController.login);

//route for refresh token
router.post("/refresh-token", authController.requestRefreshToken);

//route for log out
router.post("/logout", protect, authController.logout);

// ADMIN PAGE

// routes/auth.route.js
router.post("/admin/login", authController.loginAdmin);
router.post("/admin/logout", authController.logoutAdmin);
router.post("/admin/refresh-token", authController.refreshAdminToken);

module.exports = router;
