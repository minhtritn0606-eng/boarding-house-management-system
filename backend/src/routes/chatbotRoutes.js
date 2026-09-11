const express = require('express');
const { handleChatbotMessage } = require('../controllers/chatbotController');

const router = express.Router();

// Route nhận tin nhắn từ người dùng công khai (không bắt buộc đăng nhập)
router.post('/message', handleChatbotMessage);

module.exports = router;
