const express = require('express');
const {
  createContractHandler,
  cancelContractHandler,
  listContractsHandler,
} = require('../controllers/contractController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listContractsHandler);
router.post('/', optionalAuth, createContractHandler);
router.post('/:id/cancel', optionalAuth, cancelContractHandler);

module.exports = router;
