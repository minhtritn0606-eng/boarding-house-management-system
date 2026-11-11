const express = require('express');
const {
  createPostHandler,
  listPostsHandler,
  getPostDetailsHandler,
  updatePostHandler,
  deletePostHandler,
  recheckPostAIHandler,
} = require('../controllers/postController');
const { optionalAuth, authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listPostsHandler);
router.get('/:id', optionalAuth, getPostDetailsHandler);
router.post('/', optionalAuth, createPostHandler);
router.put('/:id', optionalAuth, updatePostHandler);
router.delete('/:id', optionalAuth, deletePostHandler);
router.post('/:id/recheck-ai', optionalAuth, recheckPostAIHandler);

module.exports = router;
