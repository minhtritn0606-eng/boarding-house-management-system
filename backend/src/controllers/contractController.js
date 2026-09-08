const {
  createContract,
  findContractById,
  listContractsByLandlord,
  cancelContract,
} = require('../models/contractModel');
const { findRoomById } = require('../models/roomModel');
const { findTenantById } = require('../models/tenantModel');
const { findHouseById } = require('../models/houseModel');
const { getPool } = require('../config/database');

async function createContractHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const pool = await getPool();
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    const landlordId = landlords.length > 0 ? landlords[0].id : 1;

    const { tenantId, roomId, startDate, endDate, rentAmount } = req.body;

    if (!tenantId || !roomId || !startDate || !endDate || rentAmount === undefined) {
      return res.status(400).json({ message: 'tenantId, roomId, startDate, endDate, and rentAmount are required' });
    }

    const room = await findRoomById(Number(roomId));
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const tenant = await findTenantById(Number(tenantId));
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const contract = await createContract({
      landlordId,
      tenantId: Number(tenantId),
      roomId: Number(roomId),
      startDate,
      endDate,
      rentAmount,
    });
    return res.status(201).json({ message: 'Contract created successfully', contract });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create contract', error: error.message });
  }
}

async function cancelContractHandler(req, res) {
  try {
    const contractId = Number(req.params.id);
    const contract = await findContractById(contractId);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }

    const cancelled = await cancelContract(contractId);
    return res.status(200).json({ message: 'Contract cancelled successfully', contract: cancelled });
  } catch (error) {
    return res.status(500).json({ message: 'Could not cancel contract', error: error.message });
  }
}

async function listContractsHandler(req, res) {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(`
      SELECT c.*, 
             r.title AS room_title, r.price AS room_price,
             t.full_name AS tenant_name, t.phone AS tenant_phone,
             h.name AS house_name
      FROM contracts c
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN tenants t ON c.tenant_id = t.id
      LEFT JOIN boarding_houses h ON r.boarding_house_id = h.id
      ORDER BY c.id DESC
    `);
    return res.status(200).json({ contracts: rows });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch contracts', error: error.message });
  }
}

module.exports = {
  createContractHandler,
  cancelContractHandler,
  listContractsHandler,
};
