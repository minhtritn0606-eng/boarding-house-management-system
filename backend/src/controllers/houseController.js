const {
  createHouse,
  findHouseById,
  findHousesByLandlord,
  updateHouse,
  deleteHouse,
} = require('../models/houseModel');

async function createHouseHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { name, address, city, description } = req.body;

    if (!name || !address || !city) {
      return res.status(400).json({ message: 'name, address, and city are required' });
    }

    const house = await createHouse({ landlordId, name, address, city, description });
    return res.status(201).json({ message: 'House created successfully', house });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create house', error: error.message });
  }
}

async function updateHouseHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const houseId = Number(req.params.id);
    const house = await findHouseById(houseId);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    if (house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedHouse = await updateHouse(houseId, req.body);
    return res.status(200).json({ message: 'House updated successfully', house: updatedHouse });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update house', error: error.message });
  }
}

async function deleteHouseHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const houseId = Number(req.params.id);
    const house = await findHouseById(houseId);

    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    if (house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    await deleteHouse(houseId);
    return res.status(200).json({ message: 'House deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete house', error: error.message });
  }
}

async function getMyHousesHandler(req, res) {
  try {
    const landlordId = req.user.id;
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
};
