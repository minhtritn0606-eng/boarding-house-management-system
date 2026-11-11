const express = require('express');
const {
  getNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
} = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, getNotificationsHandler);
router.put('/read-all', authenticateToken, markAllAsReadHandler);
router.put('/:id/read', authenticateToken, markAsReadHandler);

module.exports = router;
