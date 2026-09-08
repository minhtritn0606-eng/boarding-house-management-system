const {
  createTenant,
  findTenantById,
  listTenants,
  updateTenant,
  deleteTenant,
} = require('../models/tenantModel');

const { getPool } = require('../config/database');

async function createTenantHandler(req, res) {
  try {
    const userId = req.user?.id || 1;
    const pool = await getPool();
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    const landlordId = landlords.length > 0 ? landlords[0].id : 1;

    const { fullName, name, email, phone, idCard, identityNumber, hometown, job, emergencyContact, note, notes } = req.body;

    const tenantName = fullName || name;
    if (!tenantName) {
      return res.status(400).json({ message: 'Họ tên khách thuê là bắt buộc' });
    }

    const tenant = await createTenant({
      landlordId,
      fullName: tenantName,
      email,
      phone: phone || '0905 111 222',
      idCard: idCard || identityNumber,
      identityNumber: identityNumber || idCard,
      hometown,
      job,
      emergencyContact,
      note: note || notes,
    });

    return res.status(201).json({ message: 'Tenant added successfully', tenant });
  } catch (error) {
    return res.status(500).json({ message: 'Could not add tenant', error: error.message });
  }
}

async function updateTenantHandler(req, res) {
  try {
    const tenantId = Number(req.params.id);
    const tenant = await findTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const updatedTenant = await updateTenant(tenantId, req.body);
    return res.status(200).json({ message: 'Tenant updated successfully', tenant: updatedTenant });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update tenant', error: error.message });
  }
}

async function deleteTenantHandler(req, res) {
  try {
    const tenantId = Number(req.params.id);
    const tenant = await findTenantById(tenantId);

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    await deleteTenant(tenantId);
    return res.status(200).json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete tenant', error: error.message });
  }
}

async function listTenantsHandler(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    const tenants = await listTenants({ userId, ...req.query });
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
