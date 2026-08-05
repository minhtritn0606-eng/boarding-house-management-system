const {
  createTenant,
  findTenantById,
  listTenantsByLandlord,
  updateTenant,
  deleteTenant,
} = require('../models/tenantModel');

async function createTenantHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { fullName, email, phone, identityNumber, note } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: 'fullName is required' });
    }

    const tenant = await createTenant({ landlordId, fullName, email, phone, identityNumber, note });
    return res.status(201).json({ message: 'Tenant added successfully', tenant });
  } catch (error) {
    return res.status(500).json({ message: 'Could not add tenant', error: error.message });
  }
}

async function updateTenantHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const tenantId = Number(req.params.id);
    const tenant = await findTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedTenant = await updateTenant(tenantId, req.body);
    return res.status(200).json({ message: 'Tenant updated successfully', tenant: updatedTenant });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update tenant', error: error.message });
  }
}

async function deleteTenantHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const tenantId = Number(req.params.id);
    const tenant = await findTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    await deleteTenant(tenantId);
    return res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete tenant', error: error.message });
  }
}

async function listTenantsHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const tenants = await listTenantsByLandlord(landlordId);
    return res.status(200).json({ tenants });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch tenants', error: error.message });
  }
}

module.exports = {
  createTenantHandler,
  updateTenantHandler,
  deleteTenantHandler,
  listTenantsHandler,
};
