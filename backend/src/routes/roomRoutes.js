const express = require('express');
const {
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  publishRoomHandler,
  getRoomDetailsHandler,
  listPublishedRoomsHandler,
} = require('../controllers/roomController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', listPublishedRoomsHandler);
router.get('/:id', getRoomDetailsHandler);
router.post('/', authenticateToken, authorizeRoles('landlord'), createRoomHandler);
router.put('/:id', authenticateToken, authorizeRoles('landlord'), updateRoomHandler);
router.delete('/:id', authenticateToken, authorizeRoles('landlord'), deleteRoomHandler);
router.post('/:id/publish', authenticateToken, authorizeRoles('landlord'), publishRoomHandler);

module.exports = router;
