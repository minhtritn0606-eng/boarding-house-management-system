const {
  createBill,
  findBillById,
  listBills,
  updateBill,
  deleteBill,
} = require('../models/billModel');

const { getPool } = require('../config/database');

async function createBillHandler(req, res) {
  try {
    const userId = req.user?.id || 1;
    const pool = await getPool();
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    const landlordId = landlords.length > 0 ? landlords[0].id : 1;

    const bill = await createBill({
      ...req.body,
      landlordId,
    });
    return res.status(201).json({ message: 'Bill created successfully', bill });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create bill', error: error.message });
  }
}

async function updateBillHandler(req, res) {
  try {
    const billId = Number(req.params.id);
    const bill = await findBillById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const updatedBill = await updateBill(billId, req.body);
    return res.status(200).json({ message: 'Bill updated successfully', bill: updatedBill });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update bill', error: error.message });
  }
}

async function deleteBillHandler(req, res) {
  try {
    const billId = Number(req.params.id);
    const bill = await findBillById(billId);

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    await deleteBill(billId);
    return res.status(200).json({ message: 'Bill deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete bill', error: error.message });
  }
}

async function listBillsHandler(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    const bills = await listBills({ userId, ...req.query });
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
