const {
  createHouse,
  findHouseById,
  findHousesByLandlord,
  listAllHouses,
  updateHouse,
  deleteHouse,
} = require('../models/houseModel');
const { getPool } = require('../config/database');

async function listHousesHandler(req, res) {
  try {
    const userId = req.user?.id || req.query.userId;
    const houses = await listAllHouses({ userId, ...req.query });
    return res.status(200).json({ houses });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch houses', error: error.message });
  }
}

async function createHouseHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const { name, address, city, description } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ message: 'name, address, and city are required' });
    }

    const pool = await getPool();
    let landlordId;
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    if (landlords.length > 0) {
      landlordId = landlords[0].id;
    } else {
      const [lRes] = await pool.query(
        'INSERT INTO landlords (user_id, company_name, address) VALUES (?, ?, ?)',
        [userId, 'Chủ trọ', address]
      );
      landlordId = lRes.insertId;
    }

    const house = await createHouse({ landlordId, name, address, city, description });
    return res.status(201).json({ message: 'House created successfully', house });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create house', error: error.message });
  }
}

async function updateHouseHandler(req, res) {
  try {
    const houseId = Number(req.params.id);
    const house = await findHouseById(houseId);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const updatedHouse = await updateHouse(houseId, req.body);
    return res.status(200).json({ message: 'House updated successfully', house: updatedHouse });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update house', error: error.message });
  }
}

async function deleteHouseHandler(req, res) {
  try {
    const houseId = Number(req.params.id);
    const house = await findHouseById(houseId);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    await deleteHouse(houseId);
    return res.status(200).json({ message: 'House deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete house', error: error.message });
  }
}

async function getMyHousesHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const pool = await getPool();
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    const landlordId = landlords.length > 0 ? landlords[0].id : 1;
    const houses = await findHousesByLandlord(landlordId);
    return res.status(200).json({ houses });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch houses', error: error.message });
  }
}

async function getHouseDetailsHandler(req, res) {
  try {
    const houseId = Number(req.params.id);
    const house = await findHouseById(houseId);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    return res.status(200).json({ house });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch house details', error: error.message });
  }
}

module.exports = {
  createHouseHandler,
  updateHouseHandler,
  deleteHouseHandler,
  getMyHousesHandler,
  getHouseDetailsHandler,
  listHousesHandler,
};
