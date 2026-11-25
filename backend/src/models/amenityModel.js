const { getPool } = require('../config/database');

const DEFAULT_AMENITIES_LIST = [
  { id: 1, name: 'Wifi tốc độ cao', code: 'wifi', icon: 'wifi' },
  { id: 2, name: 'Điều hòa', code: 'ac', icon: 'wind' },
  { id: 3, name: 'Máy giặt', code: 'washing_machine', icon: 'disc' },
  { id: 4, name: 'Bình nóng lạnh', code: 'water_heater', icon: 'droplet' },
  { id: 5, name: 'Nhà vệ sinh riêng', code: 'private_wc', icon: 'check-circle' },
  { id: 6, name: 'Tủ lạnh', code: 'fridge', icon: 'box' },
  { id: 7, name: 'Gác lửng', code: 'mezzanine', icon: 'layers' },
  { id: 8, name: 'Chỗ để xe', code: 'parking', icon: 'shield' },
  { id: 9, name: 'Ban công', code: 'balcony', icon: 'sun' },
  { id: 10, name: 'Thang máy', code: 'elevator', icon: 'arrow-up' },
  { id: 11, name: 'Giờ giấc tự do', code: 'free_hours', icon: 'clock' },
  { id: 12, name: 'Bếp nấu ăn', code: 'kitchen', icon: 'coffee' },
  { id: 13, name: 'Camera an ninh', code: 'cctv', icon: 'video' },
  { id: 14, name: 'Bảo vệ 24/7', code: 'security_247', icon: 'shield' },
  { id: 15, name: 'Khóa vân tay', code: 'fingerprint_lock', icon: 'key' },
  { id: 16, name: 'Không chung chủ', code: 'independent', icon: 'home' },
  { id: 17, name: 'Tủ quần áo', code: 'wardrobe', icon: 'box' },
  { id: 18, name: 'Giường nệm', code: 'bed', icon: 'moon' },
  { id: 19, name: 'Bàn làm việc', code: 'desk', icon: 'layout' },
  { id: 20, name: 'Cửa sổ', code: 'window', icon: 'sun' },
  { id: 21, name: 'Nuôi thú cưng', code: 'pet_allowed', icon: 'heart' },
  { id: 22, name: 'Sân phơi', code: 'drying_yard', icon: 'sun' },
  { id: 23, name: 'Tủ bếp', code: 'kitchen_cabinet', icon: 'box' },
  { id: 24, name: 'Tivi', code: 'tv', icon: 'tv' }
];

async function ensureAmenitiesTable() {
  const pool = await getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS amenities (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      code VARCHAR(50) NOT NULL UNIQUE,
      icon VARCHAR(50) DEFAULT 'check-circle',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_amenities (
      post_id BIGINT NOT NULL,
      amenity_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, amenity_id),
      CONSTRAINT fk_pa_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_pa_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS room_amenities (
      room_id BIGINT NOT NULL,
      amenity_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (room_id, amenity_id),
      CONSTRAINT fk_ra_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      CONSTRAINT fk_ra_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `).catch(() => {});

  // Tự động seed đầy đủ 24 tiện ích chuẩn
  try {
    for (const item of DEFAULT_AMENITIES_LIST) {
      await pool.query(
        'INSERT INTO amenities (id, name, code, icon) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), icon = VALUES(icon)',
        [item.id, item.name, item.code, item.icon]
      ).catch(() => {});
    }
  } catch {}
}

async function listAllAmenities() {
  await ensureAmenitiesTable();
  const pool = await getPool();
  const [rows] = await pool.query('SELECT * FROM amenities ORDER BY id ASC');
  return rows;
}

// Chuẩn hóa chuỗi so khớp
function normalizeStr(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function syncPostAmenities(postId, amenitiesInput) {
  if (!postId) return;
  await ensureAmenitiesTable();
  const pool = await getPool();

  try {
    await pool.query('DELETE FROM post_amenities WHERE post_id = ?', [postId]);

    let list = [];
    if (Array.isArray(amenitiesInput)) {
      list = amenitiesInput;
    } else if (typeof amenitiesInput === 'string') {
      list = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (list.length === 0) return;

    const [all] = await pool.query('SELECT id, name, code FROM amenities');
    for (const item of list) {
      const norm = normalizeStr(item);
      let match = all.find(
        (a) =>
          normalizeStr(a.name) === norm ||
          normalizeStr(a.code) === norm ||
          normalizeStr(a.name).includes(norm) ||
          norm.includes(normalizeStr(a.name))
      );

      // Nếu chưa có tiện ích này trong DB, tự động tạo mới để không bị sót
      if (!match) {
        const code = norm.slice(0, 30) || `amenity_${Date.now()}`;
        const [insertRes] = await pool.query(
          'INSERT INTO amenities (name, code, icon) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
          [item.trim(), code, 'check-circle']
        ).catch(() => [{ insertId: null }]);
        if (insertRes && insertRes.insertId) {
          match = { id: insertRes.insertId };
        }
      }

      if (match) {
        await pool.query(
          'INSERT IGNORE INTO post_amenities (post_id, amenity_id) VALUES (?, ?)',
          [postId, match.id]
        );
      }
    }
  } catch (err) {
    console.warn('Lỗi đồng bộ post_amenities:', err.message);
  }
}

async function syncRoomAmenities(roomId, amenitiesInput) {
  if (!roomId) return;
  await ensureAmenitiesTable();
  const pool = await getPool();

  try {
    await pool.query('DELETE FROM room_amenities WHERE room_id = ?', [roomId]);

    let list = [];
    if (Array.isArray(amenitiesInput)) {
      list = amenitiesInput;
    } else if (typeof amenitiesInput === 'string') {
      list = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    }

    if (list.length === 0) return;

    const [all] = await pool.query('SELECT id, name, code FROM amenities');
    for (const item of list) {
      const norm = normalizeStr(item);
      let match = all.find(
        (a) =>
          normalizeStr(a.name) === norm ||
          normalizeStr(a.code) === norm ||
          normalizeStr(a.name).includes(norm) ||
          norm.includes(normalizeStr(a.name))
      );

      // Nếu chưa có trong DB, tự động tạo mới
      if (!match) {
        const code = norm.slice(0, 30) || `amenity_${Date.now()}`;
        const [insertRes] = await pool.query(
          'INSERT INTO amenities (name, code, icon) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
          [item.trim(), code, 'check-circle']
        ).catch(() => [{ insertId: null }]);
        if (insertRes && insertRes.insertId) {
          match = { id: insertRes.insertId };
        }
      }

      if (match) {
        await pool.query(
          'INSERT IGNORE INTO room_amenities (room_id, amenity_id) VALUES (?, ?)',
          [roomId, match.id]
        );
      }
    }
  } catch (err) {
    console.warn('Lỗi đồng bộ room_amenities:', err.message);
  }
}

module.exports = {
  ensureAmenitiesTable,
  listAllAmenities,
  syncPostAmenities,
  syncRoomAmenities,
  DEFAULT_AMENITIES_LIST,
};
