const {
  createRoom,
  findRoomById,
  updateRoom,
  deleteRoom,
  listPublishedRooms,
} = require('../models/roomModel');
const { findHouseById } = require('../models/houseModel');

async function createRoomHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const { boardingHouseId, title, description, price } = req.body;

    if (!boardingHouseId || !title || price === undefined) {
      return res.status(400).json({ message: 'boardingHouseId, title, and price are required' });
    }

    const house = await findHouseById(Number(boardingHouseId));
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    if (house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Cannot add room for a house you do not own' });
    }

    const room = await createRoom({ boardingHouseId: house.id, title, description, price });
    return res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    return res.status(500).json({ message: 'Could not create room', error: error.message });
  }
}

async function updateRoomHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const house = await findHouseById(room.boardingHouseId);
    if (!house || house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const updatedRoom = await updateRoom(roomId, req.body);
    return res.status(200).json({ message: 'Room updated successfully', room: updatedRoom });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update room', error: error.message });
  }
}

async function deleteRoomHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const house = await findHouseById(room.boardingHouseId);
    if (!house || house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    await deleteRoom(roomId);
    return res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete room', error: error.message });
  }
}

async function publishRoomHandler(req, res) {
  try {
    const landlordId = req.user.id;
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const house = await findHouseById(room.boardingHouseId);
    if (!house || house.landlordId !== landlordId) {
      return res.status(403).json({ message: 'Action not allowed' });
    }

    const publishedRoom = await updateRoom(roomId, { isPublished: true });
    return res.status(200).json({ message: 'Room published successfully', room: publishedRoom });
  } catch (error) {
    return res.status(500).json({ message: 'Could not publish room', error: error.message });
  }
}

async function getRoomDetailsHandler(req, res) {
  try {
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    return res.status(200).json({ room });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch room details', error: error.message });
  }
}

async function listPublishedRoomsHandler(req, res) {
  try {
    const rooms = await listPublishedRooms();
    return res.status(200).json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch rooms', error: error.message });
  }
}

module.exports = {
  createRoomHandler,
  updateRoomHandler,
  deleteRoomHandler,
  publishRoomHandler,
  getRoomDetailsHandler,
  listPublishedRoomsHandler,
};
