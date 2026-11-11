const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
} = require('../models/notificationModel');

/**
 * Lấy danh sách thông báo và số lượng chưa đọc của người dùng hiện tại
 */
async function getNotificationsHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để xem thông báo' });
    }

    const limit = req.query.limit ? Number(req.query.limit) : 30;
    const notifications = await getUserNotifications(userId, limit);
    const unreadCount = await getUnreadCount(userId);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách thông báo:', error);
    return res.status(500).json({ message: 'Không thể tải thông báo', error: error.message });
  }
}

/**
 * Đánh dấu một thông báo là đã đọc
 */
async function markAsReadHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const notificationId = Number(req.params.id);
    await markNotificationAsRead(notificationId, userId);
    const unreadCount = await getUnreadCount(userId);

    return res.status(200).json({ message: 'Đã đánh dấu đã đọc', unreadCount });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi cập nhật thông báo', error: error.message });
  }
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
async function markAllAsReadHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    await markAllNotificationsAsRead(userId);

    return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc', unreadCount: 0 });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi cập nhật thông báo', error: error.message });
  }
}

/**
 * Xóa một thông báo
 */
async function deleteNotificationHandler(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập' });
    }

    const notificationId = Number(req.params.id);
    const success = await deleteNotification(notificationId, userId);
    const unreadCount = await getUnreadCount(userId);

    if (!success) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo hoặc bạn không có quyền xóa' });
    }

    return res.status(200).json({ message: 'Đã xóa thông báo thành công', unreadCount });
  } catch (error) {
    console.error('Lỗi khi xóa thông báo:', error);
    return res.status(500).json({ message: 'Lỗi khi xóa thông báo', error: error.message });
  }
}

module.exports = {
  getNotificationsHandler,
  markAsReadHandler,
  markAllAsReadHandler,
  deleteNotificationHandler,
};
