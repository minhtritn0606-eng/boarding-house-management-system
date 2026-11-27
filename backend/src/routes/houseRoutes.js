const express = require('express');
const {
  createHouseHandler,
  updateHouseHandler,
  deleteHouseHandler,
  listHousesHandler,
  getHouseUtilitiesHandler,
  saveHouseUtilitiesHandler,
} = require('../controllers/houseController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listHousesHandler);
router.post('/', optionalAuth, createHouseHandler);
router.get('/:id/utilities', optionalAuth, getHouseUtilitiesHandler);
router.put('/:id/utilities', optionalAuth, saveHouseUtilitiesHandler);
router.post('/:id/utilities', optionalAuth, saveHouseUtilitiesHandler);
router.put('/:id', optionalAuth, updateHouseHandler);
router.delete('/:id', optionalAuth, deleteHouseHandler);

module.exports = router;
