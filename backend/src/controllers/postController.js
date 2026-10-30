const {
  createPost,
  findPostById,
  listPosts,
  updatePost,
  deletePost,
} = require('../models/postModel');
const { getPool } = require('../config/database');

async function createPostHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const {
      title,
      description,
      price,
      area,
      roomType,
      address,
      city,
      district,
      latitude,
      longitude,
      amenities,
      images,
      contactPhone,
      contactName,
      boardingHouseId,
    } = req.body;

    if (!title || price === undefined || !address) {
      return res.status(400).json({ message: 'Tiêu đề, giá thuê và địa chỉ là bắt buộc' });
    }

    const pool = await getPool();

    // 1. Tìm hoặc tạo hồ sơ landlord cho user này
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

    // 2. Tìm hoặc liên kết boarding_house
    let targetHouseId = boardingHouseId ? Number(boardingHouseId) : null;
    if (!targetHouseId) {
      const [existingHouses] = await pool.query(
        'SELECT id FROM boarding_houses WHERE landlord_id = ? LIMIT 1',
        [landlordId]
      );
      if (existingHouses.length > 0) {
        targetHouseId = existingHouses[0].id;
      } else {
        const [hRes] = await pool.query(
          'INSERT INTO boarding_houses (landlord_id, name, address, city, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [landlordId, `Nhà trọ ${address.slice(0, 30)}`, address, city || 'Đà Nẵng', district || 'Liên Chiểu', latitude || null, longitude || null]
        );
        targetHouseId = hRes.insertId;
      }
    }

    // 3. Tạo bài đăng mới trong bảng posts
    const post = await createPost({
      landlordId,
      boardingHouseId: targetHouseId,
      title,
      description,
      price: Number(price),
      area: area ? Number(area) : 20,
      roomType: roomType || 'private',
      address,
      city: city || 'Đà Nẵng',
      district: district || '',
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      amenities,
      contactPhone: contactPhone || req.user?.phone || '0905 888 999',
      contactName: contactName || req.user?.fullName || 'Chủ trọ',
      images: Array.isArray(images) ? images : [],
    });

    return res.status(201).json({ message: 'Tạo bài đăng thành công', post, room: post });
  } catch (error) {
    console.error('Lỗi khi tạo bài đăng:', error);
    return res.status(500).json({ message: 'Không thể tạo bài đăng', error: error.message });
  }
}

async function listPostsHandler(req, res) {
  try {
    const { search, city, district, minPrice, maxPrice, roomType, status, landlordId, ownerEmail, mine } = req.query;

    let userId = req.query.userId ? Number(req.query.userId) : undefined;
    if (mine === 'true' || mine === '1') {
      userId = req.user?.id;
    }

    const posts = await listPosts({
      search,
      city,
      district,
      minPrice,
      maxPrice,
      roomType,
      status,
      userId,
      landlordId: landlordId ? Number(landlordId) : undefined,
      ownerEmail,
      mine: mine === 'true' || mine === '1',
    });

    return res.status(200).json({ posts, rooms: posts }); // Alias 'rooms' để tương thích ngược 100% với Frontend
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải danh sách bài đăng', error: error.message });
  }
}

async function getPostDetailsHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    return res.status(200).json({ post, room: post }); // Alias 'room' để tương thích ngược 100% với DetailPage
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải chi tiết bài đăng', error: error.message });
  }
}

async function updatePostHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const updatedPost = await updatePost(postId, req.body);
    return res.status(200).json({ message: 'Cập nhật bài đăng thành công', post: updatedPost, room: updatedPost });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật bài đăng', error: error.message });
  }
}

async function deletePostHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    await deletePost(postId);
    return res.status(200).json({ message: 'Đã xóa bài đăng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể xóa bài đăng', error: error.message });
  }
}

module.exports = {
  createPostHandler,
  listPostsHandler,
  getPostDetailsHandler,
  updatePostHandler,
  deletePostHandler,
};
