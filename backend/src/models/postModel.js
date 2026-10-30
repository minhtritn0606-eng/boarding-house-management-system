const { getPool } = require('../config/database');

async function ensurePostsTable() {
  const pool = await getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      landlord_id BIGINT NOT NULL,
      boarding_house_id BIGINT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(12,2) NOT NULL,
      area DECIMAL(8,2) DEFAULT 20.0,
      room_type VARCHAR(50) DEFAULT 'private',
      address VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL DEFAULT 'Đà Nẵng',
      district VARCHAR(100) DEFAULT NULL,
      latitude DECIMAL(10,8) DEFAULT NULL,
      longitude DECIMAL(11,8) DEFAULT NULL,
      amenities TEXT DEFAULT NULL,
      contact_phone VARCHAR(20) DEFAULT NULL,
      contact_name VARCHAR(100) DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_posts_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
      CONSTRAINT fk_posts_house FOREIGN KEY (boarding_house_id) REFERENCES boarding_houses(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_images (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      post_id BIGINT NOT NULL,
      image_url LONGTEXT NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )
  `);

  // Tự động sao chép các bài đăng mẫu sẵn có sang bảng posts nếu bảng posts đang trống
  try {
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM posts');
    if (countRows[0].total === 0) {
      const [sampleRooms] = await pool.query(`
        SELECT r.id, r.boarding_house_id, r.title, r.description, r.price, r.area, r.room_type,
               h.landlord_id, h.address, h.city, h.district, h.latitude, h.longitude,
               r.amenities, u.phone AS contact_phone, u.full_name AS contact_name, r.created_at
        FROM rooms r
        JOIN boarding_houses h ON r.boarding_house_id = h.id
        JOIN landlords l ON h.landlord_id = l.id
        JOIN users u ON l.user_id = u.id
        WHERE r.id IN (103, 202, 302, 401, 402, 501, 601)
      `);

      for (const row of sampleRooms) {
        const [pRes] = await pool.query(
          `INSERT INTO posts (id, landlord_id, boarding_house_id, title, description, price, area, room_type, address, city, district, latitude, longitude, amenities, contact_phone, contact_name, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
          [
            row.id,
            row.landlord_id,
            row.boarding_house_id,
            row.title,
            row.description,
            row.price,
            row.area || 20,
            row.room_type || 'private',
            row.address,
            row.city || 'Đà Nẵng',
            row.district || 'Liên Chiểu',
            row.latitude,
            row.longitude,
            row.amenities,
            row.contact_phone || '0905 888 999',
            row.contact_name || 'Chủ trọ',
            row.created_at || new Date(),
          ]
        );

        const newPostId = pRes.insertId || row.id;

        // Copy images
        const [images] = await pool.query('SELECT image_url, is_primary FROM room_images WHERE room_id = ?', [row.id]);
        for (const img of images) {
          await pool.query(
            'INSERT INTO post_images (post_id, image_url, is_primary) VALUES (?, ?, ?)',
            [newPostId, img.image_url, img.is_primary]
          );
        }
      }
    }
  } catch (seedErr) {
    console.warn('Lỗi tự động khởi tạo dữ liệu mẫu cho bảng posts:', seedErr.message);
  }
}

async function createPost({
  landlordId,
  boardingHouseId = null,
  title,
  description = '',
  price,
  area = 20,
  roomType = 'private',
  address,
  city = 'Đà Nẵng',
  district = '',
  latitude = null,
  longitude = null,
  amenities = '',
  contactPhone = '',
  contactName = '',
  images = [],
}) {
  await ensurePostsTable();
  const pool = await getPool();

  const [res] = await pool.query(
    `INSERT INTO posts 
     (landlord_id, boarding_house_id, title, description, price, area, room_type, address, city, district, latitude, longitude, amenities, contact_phone, contact_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      landlordId,
      boardingHouseId,
      title,
      description,
      price,
      area,
      roomType,
      address,
      city,
      district || null,
      latitude,
      longitude,
      Array.isArray(amenities) ? amenities.join(', ') : amenities,
      contactPhone,
      contactName,
    ]
  );

  const postId = res.insertId;

  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      try {
        await pool.query(
          'INSERT INTO post_images (post_id, image_url, is_primary) VALUES (?, ?, ?)',
          [postId, images[i], i === 0]
        );
      } catch (imgErr) {
        console.error('Lỗi lưu ảnh bài đăng:', imgErr.message);
      }
    }
  }

  return await findPostById(postId);
}

async function findPostById(id) {
  await ensurePostsTable();
  const pool = await getPool();

  const [rows] = await pool.query(
    `SELECT p.*,
            h.name AS house_name,
            u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
     FROM posts p
     LEFT JOIN boarding_houses h ON p.boarding_house_id = h.id
     LEFT JOIN landlords l ON p.landlord_id = l.id
     LEFT JOIN users u ON l.user_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  if (rows.length === 0) return null;

  const row = rows[0];
  const [imgRows] = await pool.query(
    'SELECT image_url, is_primary FROM post_images WHERE post_id = ? ORDER BY is_primary DESC, id ASC',
    [id]
  );

  const defaultImages = [
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  ];

  const images = imgRows.length > 0 ? imgRows.map((r) => r.image_url) : defaultImages;

  return {
    id: row.id,
    boardingHouseId: row.boarding_house_id,
    title: row.title,
    description: row.description || '',
    price: Number(row.price),
    area: Number(row.area) || 20,
    roomType: row.room_type || 'private',
    address: row.address,
    city: row.city || 'Đà Nẵng',
    district: row.district || '',
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    amenities: row.amenities ? row.amenities.split(',').map((s) => s.trim()).filter(Boolean) : ['Wifi', 'Nóng lạnh'],
    contact: row.contact_phone || row.owner_phone || '0905 888 999',
    ownerName: row.contact_name || row.owner_name || 'Chủ trọ',
    ownerEmail: row.owner_email || '',
    status: row.status || 'active',
    images,
    postedDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-08-01',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listPosts(filters = {}) {
  await ensurePostsTable();
  const pool = await getPool();

  let query = `
    SELECT p.*,
           h.name AS house_name,
           u.full_name AS owner_name, u.email AS owner_email, u.phone AS owner_phone
    FROM posts p
    LEFT JOIN boarding_houses h ON p.boarding_house_id = h.id
    LEFT JOIN landlords l ON p.landlord_id = l.id
    LEFT JOIN users u ON l.user_id = u.id
    WHERE 1=1
  `;
  const values = [];

  // Khi tìm kiếm bài đăng công khai (Web)
  if (filters.status && filters.status !== 'all') {
    query += ' AND LOWER(p.status) = ?';
    values.push(filters.status.toLowerCase());
  } else if (!filters.userId && !filters.mine) {
    // Mặc định khách xem chỉ thấy các bài đang hoạt động ('active')
    query += " AND p.status = 'active'";
  }

  if (filters.search) {
    query += ' AND (LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.address) LIKE ?)';
    const term = `%${filters.search.toLowerCase()}%`;
    values.push(term, term, term);
  }

  if (filters.city && filters.city !== 'all') {
    query += ' AND (LOWER(p.city) LIKE ? OR LOWER(p.address) LIKE ?)';
    values.push(`%${filters.city.toLowerCase()}%`, `%${filters.city.toLowerCase()}%`);
  }

  if (filters.district) {
    query += ' AND LOWER(p.district) LIKE ?';
    values.push(`%${filters.district.toLowerCase()}%`);
  }

  if (filters.minPrice !== undefined) {
    query += ' AND p.price >= ?';
    values.push(Number(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    query += ' AND p.price <= ?';
    values.push(Number(filters.maxPrice));
  }

  if (filters.roomType && filters.roomType !== 'all') {
    query += ' AND LOWER(p.room_type) = ?';
    values.push(filters.roomType.toLowerCase());
  }

  if (filters.userId) {
    query += ' AND l.user_id = ?';
    values.push(filters.userId);
  } else if (filters.landlordId) {
    query += ' AND p.landlord_id = ?';
    values.push(filters.landlordId);
  } else if (filters.ownerEmail) {
    query += ' AND LOWER(u.email) = ?';
    values.push(filters.ownerEmail.toLowerCase());
  }

  query += ' ORDER BY p.id DESC';

  const [rows] = await pool.query(query, values);

  let allImages = [];
  try {
    const [imgRows] = await pool.query('SELECT post_id, image_url FROM post_images ORDER BY is_primary DESC, id ASC');
    allImages = imgRows;
  } catch (e) {}

  const defaultImages = [
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
  ];

  return rows.map((row) => {
    const postImgs = allImages.filter((img) => img.post_id === row.id).map((img) => img.image_url);

    return {
      id: row.id,
      boardingHouseId: row.boarding_house_id,
      title: row.title,
      description: row.description || '',
      price: Number(row.price),
      area: Number(row.area) || 20,
      roomType: row.room_type || 'private',
      address: row.address,
      city: row.city || 'Đà Nẵng',
      district: row.district || '',
      latitude: row.latitude != null ? Number(row.latitude) : undefined,
      longitude: row.longitude != null ? Number(row.longitude) : undefined,
      amenities: row.amenities ? row.amenities.split(',').map((s) => s.trim()).filter(Boolean) : ['Wifi', 'Nóng lạnh'],
      contact: row.contact_phone || row.owner_phone || '0905 888 999',
      ownerName: row.contact_name || row.owner_name || 'Chủ trọ',
      ownerEmail: row.owner_email || '',
      status: row.status || 'active',
      images: postImgs.length > 0 ? postImgs : defaultImages,
      postedDate: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : '2026-08-01',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

async function updatePost(id, updates) {
  await ensurePostsTable();
  const pool = await getPool();

  const fields = [];
  const values = [];

  if (updates.title) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.price !== undefined) { fields.push('price = ?'); values.push(updates.price); }
  if (updates.area !== undefined) { fields.push('area = ?'); values.push(updates.area); }
  if (updates.roomType) { fields.push('room_type = ?'); values.push(updates.roomType); }
  if (updates.address) { fields.push('address = ?'); values.push(updates.address); }
  if (updates.city) { fields.push('city = ?'); values.push(updates.city); }
  if (updates.district !== undefined) { fields.push('district = ?'); values.push(updates.district); }
  if (updates.latitude !== undefined) { fields.push('latitude = ?'); values.push(updates.latitude); }
  if (updates.longitude !== undefined) { fields.push('longitude = ?'); values.push(updates.longitude); }
  if (updates.amenities !== undefined) {
    fields.push('amenities = ?');
    values.push(Array.isArray(updates.amenities) ? updates.amenities.join(', ') : updates.amenities);
  }
  if (updates.contactPhone !== undefined) { fields.push('contact_phone = ?'); values.push(updates.contactPhone); }
  if (updates.contactName !== undefined) { fields.push('contact_name = ?'); values.push(updates.contactName); }
  if (updates.status) { fields.push('status = ?'); values.push(updates.status); }

  if (fields.length > 0) {
    values.push(id);
    await pool.query(`UPDATE posts SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  if (Array.isArray(updates.images)) {
    try {
      await pool.query('DELETE FROM post_images WHERE post_id = ?', [id]);
      for (let i = 0; i < updates.images.length; i++) {
        await pool.query(
          'INSERT INTO post_images (post_id, image_url, is_primary) VALUES (?, ?, ?)',
          [id, updates.images[i], i === 0]
        );
      }
    } catch (e) {
      console.warn('Lỗi cập nhật ảnh bài đăng:', e.message);
    }
  }

  return await findPostById(id);
}

async function deletePost(id) {
  await ensurePostsTable();
  const pool = await getPool();
  await pool.query('DELETE FROM posts WHERE id = ?', [id]);
}

module.exports = {
  ensurePostsTable,
  createPost,
  findPostById,
  listPosts,
  updatePost,
  deletePost,
};
