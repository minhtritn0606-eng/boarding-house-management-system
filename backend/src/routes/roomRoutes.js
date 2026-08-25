const express = require('express');
const {
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  publishRoomHandler,
  getRoomDetailsHandler,
  listPublishedRoomsHandler,
} = require('../controllers/roomController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', listPublishedRoomsHandler);
router.get('/:id', getRoomDetailsHandler);
router.post('/', optionalAuth, createRoomHandler);
router.put('/:id', optionalAuth, updateRoomHandler);
router.delete('/:id', optionalAuth, deleteRoomHandler);
router.post('/:id/publish', optionalAuth, publishRoomHandler);

module.exports = router;
