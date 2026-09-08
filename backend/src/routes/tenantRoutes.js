const express = require('express');
const {
  createTenantHandler,
  updateTenantHandler,
  deleteTenantHandler,
  listTenantsHandler,
} = require('../controllers/tenantController');
const { optionalAuth } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', optionalAuth, listTenantsHandler);
router.post('/', optionalAuth, createTenantHandler);
router.put('/:id', optionalAuth, updateTenantHandler);
router.delete('/:id', optionalAuth, deleteTenantHandler);

module.exports = router;
