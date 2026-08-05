const {
  createContract,
  findContractById,
  listContractsByLandlord,
  cancelContract,
} = require('../models/contractModel');
const { findRoomById } = require('../models/roomModel');
const { findTenantById } = require('../models/tenantModel');
const { findHouseById } = require('../models/houseModel');

async function createContractHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { tenantId, roomId, startDate, endDate, rentAmount } = req.body;

    if (!tenantId || !roomId || !startDate || !endDate || rentAmount === undefined) {
      return res.status(400).json({ message: 'tenantId, roomId, startDate, endDate, and rentAmount are required' });
    }

    const room = await findRoomById(Number(roomId));
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const house = await findHouseById(Number(room.boardingHouseId));
    if (!house || house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'You do not own this room' });
    }

    const tenant = await findTenantById(Number(tenantId));
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }
    if (tenant.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Tenant does not belong to your landlord account' });
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
    const landlordId = req.user.id;
    const contractId = Number(req.params.id);
    const contract = await findContractById(contractId);

    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if (contract.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const cancelled = await cancelContract(contractId);
    return res.status(200).json({ message: 'Contract cancelled successfully', contract: cancelled });
  } catch (error) {
    return res.status(500).json({ message: 'Could not cancel contract', error: error.message });
  }
}

async function listContractsHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const contracts = await listContractsByLandlord(landlordId);
    return res.status(200).json({ contracts });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch contracts', error: error.message });
  }
}

module.exports = {
  createContractHandler,
  cancelContractHandler,
  listContractsHandler,
};
