const preflight = require('../midlewares/upload-preflight');
const { guard } = require('../midlewares/security');
const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const upload = require("../midlewares/upload.midleware");

const {
  protect,
  protectAdmin,
  authorizeRoles,
} = require("../midlewares/auth.midleware");

/* --- ROUTES FOR USER --- */
router.get("/me", protect, userController.getUserProfile);

// Cập nhật thông tin user
router.put("/me", protect, userController.updateUserProfile);

// user upload avatar
router.post(
  "/avatar",
  protect,
  guard("upload"),
  preflight(),
  upload.single("avatar"),
  userController.uploadAvatar,
);

// user đổi password
router.post("/change-password", protect, userController.changeUserPassword);
router.post("/admin/change-password", protectAdmin, userController.changeUserPassword);

/* --- ROUTES FOR ADMIN --- */
router.get(
  "/admin/me",
  protectAdmin,
  userController.getUserProfile,
);

// router.post("/:id/promote", protect, isAdmin, userController.promoteUser);
// router.post("/:id/demote", protect, isAdmin, userController.demoteAdminToUser);

// lấy danh sách user
router.get(
  "/",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.getAllUsers,
);
// lấy danh sách admin
router.get(
  "/admins",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.getAllAdmins,
);

// Lấy thông tin user theo ID
router.get(
  "/profile/:id",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.getUserProfileByAdmin,
);
// Cập nhật thông tin user theo ID
router.put(
  "/profile/:id",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.updateUserById,
);
// Xóa user
router.delete(
  "/:id",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.deleteUserById,
);

// Chỉ super_admin được tạo tài khoản admin.
router.post(
  "/admin/new",
  protectAdmin,
  authorizeRoles("super_admin"),
  userController.addNewAdmin,
);

// Reset password
router.put(
  "/:id/reset-password",
  protectAdmin,
  authorizeRoles("admin", "super_admin"),
  userController.resetUserPassword,
);

module.exports = router;
