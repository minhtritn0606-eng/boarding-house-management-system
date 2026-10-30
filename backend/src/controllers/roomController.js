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
    const { boardingHouseId, title, description, price, roomType, area, floor, amenities, images, address, city, district, latitude, longitude } = req.body;

    if (!title || price === undefined) {
      return res.status(400).json({ message: 'Tiêu đề và giá thuê là bắt buộc' });
    }

    const pool = await getPool();

    // 1. Find or create landlord record for this user
    let landlordId;
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    if (landlords.length > 0) {
      landlordId = landlords[0].id;
    } else {
      const [lRes] = await pool.query(
        'INSERT INTO landlords (user_id, company_name, address) VALUES (?, ?, ?)',
        [userId, 'Chủ trọ', address || 'TP. Đà Nẵng']
      );
      landlordId = lRes.insertId;
    }

    // 2. Validate or create a boarding house strictly belonging to this landlord
    let targetHouseId = null;
    if (boardingHouseId) {
      const [validHouses] = await pool.query(
        'SELECT id FROM boarding_houses WHERE id = ? AND landlord_id = ?',
        [Number(boardingHouseId), landlordId]
      );
      if (validHouses.length > 0) {
        targetHouseId = validHouses[0].id;
        if (address || city || district || latitude !== undefined || longitude !== undefined) {
          const uFields = [];
          const uVals = [];
          if (address) { uFields.push('address = ?'); uVals.push(address); }
          if (city) { uFields.push('city = ?'); uVals.push(city); }
          if (district) { uFields.push('district = ?'); uVals.push(district); }
          if (latitude !== undefined) { uFields.push('latitude = ?'); uVals.push(latitude); }
          if (longitude !== undefined) { uFields.push('longitude = ?'); uVals.push(longitude); }
          uVals.push(targetHouseId);
          await pool.query(`UPDATE boarding_houses SET ${uFields.join(', ')} WHERE id = ?`, uVals);
        }
      }
    }

    if (!targetHouseId) {
      if (address) {
        const [existingHouses] = await pool.query(
          'SELECT id FROM boarding_houses WHERE landlord_id = ? AND address = ? LIMIT 1',
          [landlordId, address]
        );
        if (existingHouses.length > 0) {
          targetHouseId = existingHouses[0].id;
          if (latitude !== undefined || longitude !== undefined) {
            const uFields = [];
            const uVals = [];
            if (latitude !== undefined) { uFields.push('latitude = ?'); uVals.push(latitude); }
            if (longitude !== undefined) { uFields.push('longitude = ?'); uVals.push(longitude); }
            uVals.push(targetHouseId);
            await pool.query(`UPDATE boarding_houses SET ${uFields.join(', ')} WHERE id = ?`, uVals);
          }
        } else {
          const houseName = address.length > 35 ? address.substring(0, 35) + '...' : `Nhà trọ ${address}`;
          const [hRes] = await pool.query(
            'INSERT INTO boarding_houses (landlord_id, name, address, city, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [landlordId, houseName, address, city || 'Đà Nẵng', district || 'Liên Chiểu', latitude || null, longitude || null]
          );
          targetHouseId = hRes.insertId;
        }
      } else {
        const [houses] = await pool.query(
          'SELECT id FROM boarding_houses WHERE landlord_id = ? ORDER BY id ASC LIMIT 1',
          [landlordId]
        );
        if (houses.length > 0) {
          targetHouseId = houses[0].id;
        } else {
          const [hRes] = await pool.query(
            'INSERT INTO boarding_houses (landlord_id, name, address, city, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [landlordId, 'Dãy trọ chính', 'TP. Đà Nẵng', 'Đà Nẵng', 'Liên Chiểu', latitude || null, longitude || null]
          );
          targetHouseId = hRes.insertId;
        }
      }
    }

    // 3. Create room in MySQL with the landlord's boarding house
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
      isPublished: Boolean(req.body.isPublished),
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

    const nextPublishedState = req.body?.isPublished !== undefined ? Boolean(req.body.isPublished) : !room.isPublished;
    const publishedRoom = await updateRoom(roomId, { isPublished: nextPublishedState });
    return res.status(200).json({
      message: nextPublishedState ? 'Đã đăng bài lên Website thành công' : 'Đã gỡ bài đăng khỏi Website',
      room: publishedRoom,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Could not toggle publish status', error: error.message });
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
    const { search, city, minPrice, maxPrice, roomType, status, landlordId, ownerEmail, mine, public: isPublicQuery, published } = req.query;
    
    // Determine whether this request is for the landlord's internal room management (Mobile/MyRooms)
    // or public room browsing (Website portal for seekers)
    const isMine = mine === 'true' || mine === '1';
    const isExplicitPublic = isPublicQuery === 'true' || isPublicQuery === '1';

    let userId = req.query.userId ? Number(req.query.userId) : undefined;
    if (req.user?.id && (isMine || (!isExplicitPublic && !req.query.userId))) {
      userId = req.user.id;
    }

    // Public context: guest seekers browsing Website posts
    const isPublic = isExplicitPublic || (!userId && !isMine && !landlordId && !ownerEmail);

    const rooms = await listPublishedRooms({
      search,
      city,
      minPrice,
      maxPrice,
      roomType,
      status,
      userId,
      landlordId: landlordId ? Number(landlordId) : undefined,
      ownerEmail,
      isPublic,
      published: published !== undefined ? (published === 'true' || published === '1') : undefined,
    });
    return res.status(200).json({ rooms });
  } catch (error) {
    console.error('Lỗi chi tiết trong listPublishedRoomsHandler:', error);
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
