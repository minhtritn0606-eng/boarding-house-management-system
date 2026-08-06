const { createBill, findBillById, listBills, updateBill, deleteBill } = require('../models/billModel');
const { findContractById } = require('../models/contractModel');
const { findTenantById } = require('../models/tenantModel');

async function createBillHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { contractId, tenantId, title, amount, dueDate, status, billType, description } = req.body;

    if (!contractId || !tenantId || !title || amount === undefined) {
      return res.status(400).json({ message: 'contractId, tenantId, title, and amount are required' });
    }

    const contract = await findContractById(Number(contractId));
    if (!contract) {
      return res.status(404).json({ message: 'Contract not found' });
    }
    if (contract.landlordId !== landlordId) {
      return res.status(403).json({ message: 'You do not own this contract' });
    }

    const tenant = await findTenantById(Number(tenantId));
    if (!tenant || tenant.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Tenant does not belong to your landlord account' });
    }

    const bill = await createBill({
      landlordId,
      contractId: Number(contractId),
      tenantId: Number(tenantId),
      title,
      amount,
      dueDate,
      status,
      billType,
      description,
    });

    return res.status(201).json({ message: 'Bill created successfully', bill });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create bill', error: error.message });
  }
}

async function updateBillHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const billId = Number(req.params.id);
    const bill = await findBillById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    if (bill.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedBill = await updateBill(billId, req.body);
    return res.status(200).json({ message: 'Bill updated successfully', bill: updatedBill });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update bill', error: error.message });
  }
}

async function deleteBillHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const billId = Number(req.params.id);
    const bill = await findBillById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    if (bill.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    await deleteBill(billId);
    return res.status(200).json({ message: 'Bill deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete bill', error: error.message });
  }
}

async function listBillsHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { contractId, tenantId } = req.query;

    const bills = await listBills({
      landlordId,
      contractId: contractId ? Number(contractId) : null,
      tenantId: tenantId ? Number(tenantId) : null,
    });

    return res.status(200).json({ bills });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch bills', error: error.message });
  }
}

module.exports = {
  createBillHandler,
  updateBillHandler,
  deleteBillHandler,
  listBillsHandler,
};
