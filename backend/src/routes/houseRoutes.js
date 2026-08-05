const express = require('express');
const {
  createHouseHandler,
  updateHouseHandler,
  deleteHouseHandler,
  getMyHousesHandler,
  getHouseDetailsHandler,
} = require('../controllers/houseController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('landlord'), createHouseHandler);
router.get('/me', authenticateToken, authorizeRoles('landlord'), getMyHousesHandler);
router.get('/:id', getHouseDetailsHandler);
router.put('/:id', authenticateToken, authorizeRoles('landlord'), updateHouseHandler);
router.delete('/:id', authenticateToken, authorizeRoles('landlord'), deleteHouseHandler);

module.exports = router;
