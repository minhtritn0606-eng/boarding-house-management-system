const express = require('express');
const { createBillHandler, updateBillHandler, deleteBillHandler, listBillsHandler } = require('../controllers/billController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('landlord'));
router.post('/', createBillHandler);
router.get('/', listBillsHandler);
router.put('/:id', updateBillHandler);
router.delete('/:id', deleteBillHandler);

module.exports = router;
