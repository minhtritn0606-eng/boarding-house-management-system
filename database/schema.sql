-- ==============================================================================
-- BOARDING HOUSE MANAGEMENT SYSTEM - CƠ SỞ DỮ LIỆU HOÀN CHỈNH & DUY NHẤT
-- Hệ thống Quản lý Nhà trọ & Sàn Tìm phòng trọ (Đà Nẵng)
-- Tích hợp toàn diện: DDL (Cấu trúc bảng) + DML (Dữ liệu mẫu chuẩn)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS boarding_house_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE boarding_house_db;

-- ------------------------------------------------------------------------------
-- 1. XÓA CÁC BẢNG CŨ THEO THỨ TỰ RÀNG BUỘC TOÀN VẸN
-- ------------------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS viewing_requests;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS utility_bills;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS room_images;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS boarding_houses;
DROP TABLE IF EXISTS landlords;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 2. TẠO CẤU TRÚC BẢNG CHUẨN (DDL)
-- ------------------------------------------------------------------------------

-- 2.1. BẢNG TÀI KHOẢN NGƯỜI DÙNG (users)
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    role ENUM('admin', 'landlord', 'poster', 'tenant', 'visitor') NOT NULL DEFAULT 'visitor',
    property_name VARCHAR(150) DEFAULT NULL,
    property_address VARCHAR(255) DEFAULT NULL,
    property_image LONGTEXT DEFAULT NULL,
    approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_at TIMESTAMP NULL DEFAULT NULL,
    rejection_reason VARCHAR(255) DEFAULT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.2. BẢNG HỒ SƠ CHỦ TRỌ (landlords)
CREATE TABLE landlords (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    company_name VARCHAR(150) DEFAULT NULL,
    address VARCHAR(255) DEFAULT NULL,
    identity_number VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_landlords_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.3. BẢNG DÃY TRỌ / CƠ SỞ NHÀ TRỌ (boarding_houses)
CREATE TABLE boarding_houses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    landlord_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    image_url LONGTEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Đà Nẵng',
    district VARCHAR(100) DEFAULT NULL,
    ward VARCHAR(100) DEFAULT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_boarding_houses_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.4. BẢNG PHÒNG TRỌ NỘI BỘ (rooms)
CREATE TABLE rooms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    boarding_house_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    price DECIMAL(12, 2) NOT NULL,
    area DECIMAL(8, 2) DEFAULT 20.00,
    floor INT DEFAULT 1,
    room_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    status ENUM('available', 'rented', 'maintenance', 'hidden') NOT NULL DEFAULT 'available',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    available_from DATE DEFAULT NULL,
    amenities TEXT DEFAULT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_boarding_house FOREIGN KEY (boarding_house_id) REFERENCES boarding_houses(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.5. BẢNG BÀI ĐĂNG CHO THUÊ TRÊN SÀN WEB (posts)
CREATE TABLE posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    landlord_id BIGINT NOT NULL,
    boarding_house_id BIGINT DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    price DECIMAL(12, 2) NOT NULL,
    area DECIMAL(8, 2) DEFAULT 20.00,
    room_type VARCHAR(50) DEFAULT 'private',
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Đà Nẵng',
    district VARCHAR(100) DEFAULT NULL,
    latitude DECIMAL(10, 8) DEFAULT NULL,
    longitude DECIMAL(11, 8) DEFAULT NULL,
    amenities TEXT DEFAULT NULL,
    contact_phone VARCHAR(20) DEFAULT NULL,
    contact_name VARCHAR(100) DEFAULT NULL,
    status ENUM('active', 'hidden', 'closed') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_posts_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE,
    CONSTRAINT fk_posts_house FOREIGN KEY (boarding_house_id) REFERENCES boarding_houses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.6. BẢNG HÌNH ẢNH BÀI ĐĂNG (post_images)
CREATE TABLE post_images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    image_url LONGTEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_post_images_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.7. BẢNG HỒ SƠ KHÁCH THUÊ (tenants)
CREATE TABLE tenants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT DEFAULT NULL,
    landlord_id BIGINT DEFAULT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    id_card VARCHAR(50) DEFAULT NULL,
    identity_number VARCHAR(50) DEFAULT NULL,
    hometown VARCHAR(150) DEFAULT NULL,
    job VARCHAR(100) DEFAULT NULL,
    emergency_contact VARCHAR(100) DEFAULT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.8. BẢNG HỢP ĐỒNG THUÊ (contracts)
CREATE TABLE contracts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(50) DEFAULT NULL,
    room_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    landlord_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    deposit_amount DECIMAL(12, 2) DEFAULT 0.00,
    rent_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('active', 'expired', 'cancelled', 'terminated') NOT NULL DEFAULT 'active',
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_contracts_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.9. BẢNG HÓA ĐƠN & DỊCH VỤ ĐIỆN NƯỚC (utility_bills)
CREATE TABLE utility_bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_number VARCHAR(50) DEFAULT NULL,
    room_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    landlord_id BIGINT DEFAULT NULL,
    month DATE NOT NULL,
    
    -- Tiền phòng
    room_fee DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Chỉ số điện & thành tiền
    old_electric_meter INT DEFAULT 0,
    new_electric_meter INT DEFAULT 0,
    electricity_units INT DEFAULT 0,
    electric_rate DECIMAL(10, 2) DEFAULT 3500.00,
    electricity_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Chỉ số nước & thành tiền
    old_water_meter INT DEFAULT 0,
    new_water_meter INT DEFAULT 0,
    water_units INT DEFAULT 0,
    water_rate DECIMAL(10, 2) DEFAULT 15000.00,
    water_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Các khoản phí dịch vụ
    internet_fee DECIMAL(10, 2) DEFAULT 100000.00,
    trash_fee DECIMAL(10, 2) DEFAULT 30000.00,
    service_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee_note VARCHAR(255) DEFAULT NULL,
    
    -- Tổng kết & thanh toán
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('pending', 'unpaid', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'banking') DEFAULT NULL,
    due_date DATE DEFAULT NULL,
    paid_at TIMESTAMP NULL DEFAULT NULL,
    note TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_utility_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_utility_bills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.10. BẢNG GIAO DỊCH THANH TOÁN (payments)
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT NULL,
    payment_date DATE DEFAULT NULL,
    status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id) REFERENCES utility_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.11. BẢNG YÊU CẦU ĐẶT LỊCH XEM PHÒNG (viewing_requests)
CREATE TABLE viewing_requests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    landlord_id BIGINT DEFAULT NULL,
    visitor_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    viewing_date DATE NOT NULL,
    viewing_time VARCHAR(50) NOT NULL,
    note TEXT DEFAULT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.12. BẢNG THÔNG BÁO HỆ THỐNG (notifications)
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2.13. BẢNG TIN NHẮN TRAO ĐỔI (messages)
CREATE TABLE messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    room_id BIGINT DEFAULT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. CHỈ MỤC TỐI ƯU TỐC ĐỘ TRUY VẤN (INDEXES)
-- ------------------------------------------------------------------------------
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_price ON rooms(price);
CREATE INDEX idx_boarding_houses_city ON boarding_houses(city);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_landlord ON posts(landlord_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_tenant_room ON contracts(tenant_id, room_id);
CREATE INDEX idx_utility_bills_month ON utility_bills(month);
CREATE INDEX idx_utility_bills_status ON utility_bills(status);
CREATE INDEX idx_viewing_requests_landlord ON viewing_requests(landlord_id);
CREATE INDEX idx_viewing_requests_status ON viewing_requests(status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_messages_room ON messages(room_id);

-- ------------------------------------------------------------------------------
-- 4. DỮ LIỆU MẪU ĐÀ NẴNG HOÀN CHỈNH (SEED DATA)
-- ------------------------------------------------------------------------------

-- 4.1. USERS (Mật khẩu mặc định: password123)
-- Hash bcrypt tương ứng: $2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e
