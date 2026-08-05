const express = require('express');
const {
  createContractHandler,
  cancelContractHandler,
  listContractsHandler,
} = require('../controllers/contractController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('landlord'));
router.post('/', createContractHandler);
router.get('/', listContractsHandler);
router.post('/:id/cancel', cancelContractHandler);

module.exports = router;
