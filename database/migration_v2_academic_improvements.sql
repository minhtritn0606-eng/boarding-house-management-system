-- ==============================================================================
-- BOARDING HOUSE MANAGEMENT SYSTEM - MIGRATION CHUẨN HÓA CSDL (CHỈ 2 HẠN CHẾ)
-- 1. Chuẩn hóa dạng chuẩn 1 (1NF) cho tiện ích (amenities, post_amenities, room_amenities)
-- 2. Khắc phục dư thừa dữ liệu (Data Redundancy): chuyển thông tin nhà trọ sang 
--    bảng boarding_houses và loại bỏ các cột dư thừa khỏi bảng users.
-- ==============================================================================

USE boarding_house_db;

-- Dọn dẹp các bảng phụ nếu đã tạo thử nghiệm trước đó
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS maintenance_requests;

-- ------------------------------------------------------------------------------
-- PHẦN 1: KHẮC PHỤC DẠNG CHUẨN 1 (1NF) - CHUẨN HÓA TIỆN ÍCH
-- ------------------------------------------------------------------------------

-- 1.1. Bảng danh mục tiện ích chuẩn (amenities)
CREATE TABLE IF NOT EXISTS amenities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT 'check-circle',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.2. Bảng liên kết nhiều - nhiều cho bài đăng trên sàn (post_amenities)
CREATE TABLE IF NOT EXISTS post_amenities (
    post_id BIGINT NOT NULL,
    amenity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, amenity_id),
    CONSTRAINT fk_pa_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_pa_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.3. Bảng liên kết nhiều - nhiều cho phòng vật lý nội bộ (room_amenities)
CREATE TABLE IF NOT EXISTS room_amenities (
    room_id BIGINT NOT NULL,
    amenity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, amenity_id),
    CONSTRAINT fk_ra_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_ra_amenity FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dọn dẹp dữ liệu cũ của bảng tiện ích để đánh số lại ID từ 1 đến 24 sạch sẽ
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE post_amenities;
TRUNCATE TABLE room_amenities;
TRUNCATE TABLE amenities;
SET FOREIGN_KEY_CHECKS = 1;

-- Nạp đầy đủ 24 tiện ích tiêu chuẩn (khớp 100% với giao diện Đăng tin / Quản lý phòng)
INSERT INTO amenities (id, name, code, icon) VALUES
(1, 'Wifi tốc độ cao', 'wifi', 'wifi'),
(2, 'Điều hòa', 'ac', 'wind'),
(3, 'Máy giặt', 'washing_machine', 'disc'),
(4, 'Bình nóng lạnh', 'water_heater', 'droplet'),
(5, 'Nhà vệ sinh riêng', 'private_wc', 'check-circle'),
(6, 'Tủ lạnh', 'fridge', 'box'),
(7, 'Gác lửng', 'mezzanine', 'layers'),
(8, 'Chỗ để xe', 'parking', 'shield'),
(9, 'Ban công', 'balcony', 'sun'),
(10, 'Thang máy', 'elevator', 'arrow-up'),
(11, 'Giờ giấc tự do', 'free_hours', 'clock'),
(12, 'Bếp nấu ăn', 'kitchen', 'coffee'),
(13, 'Camera an ninh', 'cctv', 'video'),
(14, 'Bảo vệ 24/7', 'security_247', 'shield'),
(15, 'Khóa vân tay', 'fingerprint_lock', 'key'),
(16, 'Không chung chủ', 'independent', 'home'),
(17, 'Tủ quần áo', 'wardrobe', 'box'),
(18, 'Giường nệm', 'bed', 'moon'),
(19, 'Bàn làm việc', 'desk', 'layout'),
(20, 'Cửa sổ', 'window', 'sun'),
(21, 'Nuôi thú cưng', 'pet_allowed', 'heart'),
(22, 'Sân phơi', 'drying_yard', 'sun'),
(23, 'Tủ bếp', 'kitchen_cabinet', 'box'),
(24, 'Tivi', 'tv', 'tv');

-- Nạp dữ liệu mẫu cho bài đăng (post_amenities)
INSERT IGNORE INTO post_amenities (post_id, amenity_id) VALUES
(103, 1), (103, 2), (103, 3), (103, 8), (103, 10),
(202, 1), (202, 3), (202, 4), (202, 5), (202, 8), (202, 9), (202, 10),
(302, 1), (302, 3), (302, 6), (302, 8), (302, 10),
(401, 1), (401, 2), (401, 3), (401, 8), (401, 10),
(402, 1), (402, 3), (402, 8), (402, 10),
(501, 1), (501, 3), (501, 7), (501, 8), (501, 9), (501, 10),
(601, 1), (601, 3), (601, 8), (601, 10);

-- Nạp dữ liệu mẫu cho phòng nội bộ (room_amenities)
INSERT IGNORE INTO room_amenities (room_id, amenity_id) VALUES
(101, 1), (101, 3), (101, 10),
(102, 1), (102, 2), (102, 3), (102, 10),
(103, 1), (103, 2), (103, 3), (103, 8), (103, 10),
(201, 1), (201, 3), (201, 5), (201, 10),
(202, 1), (202, 3), (202, 4), (202, 5), (202, 8), (202, 9), (202, 10);

-- ------------------------------------------------------------------------------
-- PHẦN 2: KHẮC PHỤC DƯ THỪA DỮ LIỆU (DATA REDUNDANCY) TRONG BẢNG USERS
-- ------------------------------------------------------------------------------

-- 2.1. Đảm bảo mỗi chủ trọ có sẵn hồ sơ trong landlords và boarding_houses
INSERT INTO landlords (user_id, company_name, address)
SELECT u.id, 
       CONCAT('Nhà trọ ', u.full_name), 
       'TP. Đà Nẵng'
FROM users u
WHERE u.role = 'landlord'
  AND NOT EXISTS (SELECT 1 FROM landlords l WHERE l.user_id = u.id);

INSERT INTO boarding_houses (landlord_id, name, address, city, district)
SELECT l.id, 
       CONCAT('Nhà trọ ', u.full_name), 
       'TP. Đà Nẵng',
       'Đà Nẵng', 
       'Liên Chiểu'
FROM landlords l
JOIN users u ON l.user_id = u.id
WHERE u.role = 'landlord'
  AND NOT EXISTS (SELECT 1 FROM boarding_houses bh WHERE bh.landlord_id = l.id);

-- 2.2. Xóa các cột dư thừa khỏi bảng users (Chuẩn hóa thực thể Người dùng)
SET @exist_pname := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'property_name'
);
SET @sql_drop_pname := IF(@exist_pname > 0, 'ALTER TABLE users DROP COLUMN property_name', 'SELECT 1');
PREPARE stmt_pname FROM @sql_drop_pname;
EXECUTE stmt_pname;
DEALLOCATE PREPARE stmt_pname;

SET @exist_paddr := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'property_address'
);
SET @sql_drop_paddr := IF(@exist_paddr > 0, 'ALTER TABLE users DROP COLUMN property_address', 'SELECT 1');
PREPARE stmt_paddr FROM @sql_drop_paddr;
EXECUTE stmt_paddr;
DEALLOCATE PREPARE stmt_paddr;

SET @exist_pimg := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'property_image'
);
SET @sql_drop_pimg := IF(@exist_pimg > 0, 'ALTER TABLE users DROP COLUMN property_image', 'SELECT 1');
PREPARE stmt_pimg FROM @sql_drop_pimg;
EXECUTE stmt_pimg;
DEALLOCATE PREPARE stmt_pimg;
