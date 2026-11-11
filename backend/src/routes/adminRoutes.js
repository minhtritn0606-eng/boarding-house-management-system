const express = require('express');
const {
  getAdminStats,
  getAllUsers,
  getPendingUsers,
  updateUserApproval,
  updateUserRole,
  deleteUser,
  getAllRoomsAdmin,
  toggleRoomPublishAdmin,
  approvePostAdmin,
  rejectPostAdmin,
  recheckPostAIAdmin,
  deleteRoomAdmin,
  getAllBillsAdmin,
} = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

// 1. Thống kê tổng quan
router.get('/stats', getAdminStats);

// 2. Quản lý người dùng & Phê duyệt tài khoản
router.get('/users', getAllUsers);
router.get('/pending-users', getPendingUsers);
router.patch('/users/:id/approval', updateUserApproval);
router.put('/users/:id/approval', updateUserApproval);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

// 3. Quản lý bài đăng & phòng trọ & Kiểm duyệt AI
router.get('/rooms', getAllRoomsAdmin);
router.patch('/rooms/:id/toggle-publish', toggleRoomPublishAdmin);
router.post('/rooms/:id/approve', approvePostAdmin);
router.post('/rooms/:id/reject', rejectPostAdmin);
router.post('/rooms/:id/recheck-ai', recheckPostAIAdmin);
router.delete('/rooms/:id', deleteRoomAdmin);

// 4. Quản lý hóa đơn & giao dịch
router.get('/bills', getAllBillsAdmin);

module.exports = router;
