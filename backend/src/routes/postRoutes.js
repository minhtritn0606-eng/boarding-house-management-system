const express = require('express');
const {
  createPostHandler,
  listPostsHandler,
  getPostDetailsHandler,
  updatePostHandler,
  deletePostHandler,
} = require('../controllers/postController');
const { optionalAuth, authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listPostsHandler);
router.get('/:id', optionalAuth, getPostDetailsHandler);
router.post('/', optionalAuth, createPostHandler);
router.put('/:id', optionalAuth, updatePostHandler);
router.delete('/:id', optionalAuth, deletePostHandler);

module.exports = router;
