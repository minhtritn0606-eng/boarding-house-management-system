const express = require('express');
const {
  createTenantHandler,
  updateTenantHandler,
  deleteTenantHandler,
  listTenantsHandler,
} = require('../controllers/tenantController');
const { authenticateToken, authorizeRoles } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authenticateToken, authorizeRoles('landlord'));
router.post('/', createTenantHandler);
router.get('/', listTenantsHandler);
router.put('/:id', updateTenantHandler);
router.delete('/:id', deleteTenantHandler);

module.exports = router;
