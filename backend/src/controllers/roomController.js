const {
  createRoom,
  findRoomById,
  updateRoom,
  deleteRoom,
  listPublishedRooms,
} = require('../models/roomModel');
const { getPool } = require('../config/database');

async function createRoomHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const { boardingHouseId, title, description, price, roomType, area, floor, amenities, images } = req.body;

    if (!title || price === undefined) {
      return res.status(400).json({ message: 'Tiêu đề và giá thuê là bắt buộc' });
    }

    const pool = await getPool();

    // 1. Find or create landlord for this user
    let landlordId;
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    if (landlords.length > 0) {
      landlordId = landlords[0].id;
    } else {
      const [lRes] = await pool.query(
        'INSERT INTO landlords (user_id, company_name, address) VALUES (?, ?, ?)',
        [userId, 'Chủ trọ', 'TP. Đà Nẵng']
      );
      landlordId = lRes.insertId;
    }

    // 2. Find or create boarding house for this landlord
    let targetHouseId = boardingHouseId ? Number(boardingHouseId) : null;
    if (!targetHouseId) {
      const [houses] = await pool.query('SELECT id FROM boarding_houses WHERE landlord_id = ? LIMIT 1', [landlordId]);
      if (houses.length > 0) {
        targetHouseId = houses[0].id;
      } else {
        const [hRes] = await pool.query(
          'INSERT INTO boarding_houses (landlord_id, name, address, city, district) VALUES (?, ?, ?, ?, ?)',
          [landlordId, 'Dãy trọ Đà Nẵng', '120 Ngô Thì Nhậm, Q. Liên Chiểu, Đà Nẵng', 'Đà Nẵng', 'Liên Chiểu']
        );
        targetHouseId = hRes.insertId;
      }
    }

    // 3. Create room in MySQL
    const room = await createRoom({
      boardingHouseId: targetHouseId,
      title,
      description,
      price: Number(price),
      roomType: roomType || 'private',
      area: area ? Number(area) : 20,
      floor: floor ? Number(floor) : 1,
      amenities,
      images: Array.isArray(images) ? images : [],
    });

    return res.status(201).json({ message: 'Room created successfully', room });
  } catch (error) {
    console.error('Error creating room in MySQL:', error);
    return res.status(500).json({ message: 'Could not create room in database', error: error.message });
  }
}

async function updateRoomHandler(req, res) {
  try {
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const updatedRoom = await updateRoom(roomId, req.body);
    return res.status(200).json({ message: 'Room updated successfully', room: updatedRoom });
  } catch (error) {
    return res.status(500).json({ message: 'Could not update room', error: error.message });
  }
}

async function deleteRoomHandler(req, res) {
  try {
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    await deleteRoom(roomId);
    return res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Could not delete room', error: error.message });
  }
}

async function publishRoomHandler(req, res) {
  try {
    const roomId = Number(req.params.id);
    const room = await findRoomById(roomId);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
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
    const { search, city, minPrice, maxPrice, roomType, status } = req.query;
    const rooms = await listPublishedRooms({
      search,
      city,
      minPrice,
      maxPrice,
      roomType,
      status,
    });
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
