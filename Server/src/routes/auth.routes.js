const { guard } = require('../midlewares/security');
const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// USER PAGE

//route for register
router.post("/register", authController.register);

//route for login
router.post("/login", guard("loginAccount"), authController.login);

//route for refresh token
router.post("/refresh-token", authController.requestRefreshToken);

//route for log out
// Logout must also work after access expiry/revocation, using only the refresh cookie.
router.post("/logout", authController.logout);

// ADMIN PAGE

// routes/auth.route.js
router.post("/admin/login", guard("loginAccount"), authController.loginAdmin);
router.post("/admin/logout", authController.logoutAdmin);
router.post("/admin/refresh-token", authController.refreshAdminToken);

module.exports = router;
