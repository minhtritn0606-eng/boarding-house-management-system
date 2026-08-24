-- ==============================================================================
-- Boarding House Management System Database Schema (Full & Unified Version)
-- Hệ thống Quản lý Nhà trọ - Phiên bản CSDL hoàn chỉnh
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS boarding_house_db;
USE boarding_house_db;

-- 1. BẢNG TÀI KHOẢN NGƯỜI DÙNG
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'landlord', 'tenant', 'visitor') NOT NULL DEFAULT 'visitor',
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. BẢNG THÔNG TIN CHỦ TRỌ
CREATE TABLE IF NOT EXISTS landlords (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    company_name VARCHAR(150),
    address VARCHAR(255),
    identity_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_landlords_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. BẢNG DÃY TRỌ / NHÀ TRỌ
CREATE TABLE IF NOT EXISTS boarding_houses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    landlord_id BIGINT NOT NULL,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    ward VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_boarding_houses_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE
);

-- 4. BẢNG PHÒNG TRỌ
CREATE TABLE IF NOT EXISTS rooms (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    boarding_house_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL,
    area DECIMAL(8, 2),
    floor INT DEFAULT 1,
    room_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    status ENUM('available', 'rented', 'maintenance', 'hidden') NOT NULL DEFAULT 'available',
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    available_from DATE,
    amenities TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rooms_boarding_house FOREIGN KEY (boarding_house_id) REFERENCES boarding_houses(id) ON DELETE CASCADE
);

-- 5. BẢNG ẢNH PHÒNG TRỌ
CREATE TABLE IF NOT EXISTS room_images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_images_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- 6. BẢNG KHÁCH THUÊ
CREATE TABLE IF NOT EXISTS tenants (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    landlord_id BIGINT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    id_card VARCHAR(50),
    identity_number VARCHAR(50),
    hometown VARCHAR(150),
    job VARCHAR(100),
    emergency_contact VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. BẢNG HỢP ĐỒNG THUÊ
CREATE TABLE IF NOT EXISTS contracts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    contract_number VARCHAR(50),
    room_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    landlord_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    deposit_amount DECIMAL(12, 2) DEFAULT 0.00,
    rent_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('active', 'expired', 'cancelled', 'terminated') NOT NULL DEFAULT 'active',
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_contracts_landlord FOREIGN KEY (landlord_id) REFERENCES landlords(id) ON DELETE CASCADE
);

-- 8. BẢNG HÓA ĐƠN & TIỆN ÍCH
CREATE TABLE IF NOT EXISTS utility_bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_number VARCHAR(50),
    room_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    landlord_id BIGINT NULL,
    month DATE NOT NULL,
    
    -- Tiền phòng
    room_fee DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Điện
    old_electric_meter INT DEFAULT 0,
    new_electric_meter INT DEFAULT 0,
    electricity_units INT DEFAULT 0,
    electric_rate DECIMAL(10, 2) DEFAULT 3500.00,
    electricity_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Nước
    old_water_meter INT DEFAULT 0,
    new_water_meter INT DEFAULT 0,
    water_units INT DEFAULT 0,
    water_rate DECIMAL(10, 2) DEFAULT 15000.00,
    water_amount DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Dịch vụ phụ
    internet_fee DECIMAL(10, 2) DEFAULT 100000.00,
    trash_fee DECIMAL(10, 2) DEFAULT 30000.00,
    service_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee_note VARCHAR(255),
    
    -- Tổng kết
    total_amount DECIMAL(12, 2) NOT NULL,
    status ENUM('pending', 'unpaid', 'paid', 'overdue') NOT NULL DEFAULT 'pending',
    payment_method ENUM('cash', 'banking'),
    due_date DATE,
    paid_at TIMESTAMP NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_utility_bills_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_utility_bills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 9. BẢNG THANH TOÁN
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date DATE,
    status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id) REFERENCES utility_bills(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 10. BẢNG THÔNG BÁO
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. BẢNG TIN NHẮN
CREATE TABLE IF NOT EXISTS messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    room_id BIGINT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- CHỈ MỤC TỐI ƯU HIỆU SUẤT TRUY VẤN
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_price ON rooms(price);
CREATE INDEX idx_boarding_houses_city ON boarding_houses(city);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_tenant_room ON contracts(tenant_id, room_id);
CREATE INDEX idx_utility_bills_month ON utility_bills(month);
CREATE INDEX idx_utility_bills_status ON utility_bills(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_messages_room ON messages(room_id);
