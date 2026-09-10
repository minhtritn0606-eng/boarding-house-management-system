const express = require('express');
const {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllRoomsAdmin,
  toggleRoomPublishAdmin,
  deleteRoomAdmin,
  getAllBillsAdmin,
} = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// Cho phép truy cập trực tiếp trang quản trị
// (Không bắt buộc token đăng nhập để mở trang admin riêng thuận tiện)

// 1. Thống kê tổng quan
router.get('/stats', getAdminStats);

// 2. Quản lý người dùng
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// 3. Quản lý bài đăng & phòng trọ
router.get('/rooms', getAllRoomsAdmin);
router.patch('/rooms/:id/toggle-publish', toggleRoomPublishAdmin);
router.delete('/rooms/:id', deleteRoomAdmin);

// 4. Quản lý hóa đơn & giao dịch
router.get('/bills', getAllBillsAdmin);

module.exports = router;
