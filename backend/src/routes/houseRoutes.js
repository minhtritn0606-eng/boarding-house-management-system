const express = require('express');
const {
  createHouseHandler,
  updateHouseHandler,
  deleteHouseHandler,
  listHousesHandler,
} = require('../controllers/houseController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listHousesHandler);
router.post('/', optionalAuth, createHouseHandler);
router.put('/:id', optionalAuth, updateHouseHandler);
router.delete('/:id', optionalAuth, deleteHouseHandler);

module.exports = router;
