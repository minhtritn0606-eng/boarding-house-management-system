const express = require('express');
const {
  createBillHandler,
  updateBillHandler,
  deleteBillHandler,
  listBillsHandler,
} = require('../controllers/billController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listBillsHandler);
router.post('/', optionalAuth, createBillHandler);
router.put('/:id', optionalAuth, updateBillHandler);
router.delete('/:id', optionalAuth, deleteBillHandler);

module.exports = router;
