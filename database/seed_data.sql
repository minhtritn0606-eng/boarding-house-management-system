-- ==============================================================================
-- Full Setup & Seed Data: Khởi tạo CSDL và Nạp dữ liệu mẫu TP. Đà Nẵng
-- File chạy độc lập 100%: Tự tạo lại bảng chuẩn và nạp toàn bộ dữ liệu mẫu
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS boarding_house_db;
USE boarding_house_db;

-- 1. XÓA BẢNG CŨ THEO THỨ TỰ RÀNG BUỘC
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS utility_bills;
DROP TABLE IF EXISTS contracts;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS room_images;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS boarding_houses;
DROP TABLE IF EXISTS landlords;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 2. TẠO CẤU TRÚC BẢNG CHUẨN ĐẦY ĐỦ CÁC CỘT (ĐÃ CÓ FLOOR, AMENITIES, V.V.)
-- ==============================================================================

CREATE TABLE users (
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

CREATE TABLE landlords (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    company_name VARCHAR(150),
    address VARCHAR(255),
    identity_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_landlords_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE boarding_houses (
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

CREATE TABLE rooms (
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

CREATE TABLE room_images (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_images_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE tenants (
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

CREATE TABLE contracts (
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

CREATE TABLE utility_bills (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    bill_number VARCHAR(50),
    room_id BIGINT NOT NULL,
    tenant_id BIGINT NOT NULL,
    landlord_id BIGINT NULL,
    month DATE NOT NULL,
    room_fee DECIMAL(12, 2) DEFAULT 0.00,
    old_electric_meter INT DEFAULT 0,
    new_electric_meter INT DEFAULT 0,
    electricity_units INT DEFAULT 0,
    electric_rate DECIMAL(10, 2) DEFAULT 3500.00,
    electricity_amount DECIMAL(12, 2) DEFAULT 0.00,
    old_water_meter INT DEFAULT 0,
    new_water_meter INT DEFAULT 0,
    water_units INT DEFAULT 0,
    water_rate DECIMAL(10, 2) DEFAULT 15000.00,
    water_amount DECIMAL(12, 2) DEFAULT 0.00,
    internet_fee DECIMAL(10, 2) DEFAULT 100000.00,
    trash_fee DECIMAL(10, 2) DEFAULT 30000.00,
    service_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee DECIMAL(12, 2) DEFAULT 0.00,
    other_fee_note VARCHAR(255),
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

CREATE TABLE payments (
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

CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
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

-- ==============================================================================
-- 3. NẠP DỮ LIỆU MẪU ĐÀ NẴNG (SEED DATA)
-- ==============================================================================

-- USERS (Mật khẩu: password123)
INSERT INTO users (id, full_name, email, password_hash, phone, role, avatar) VALUES
(1, 'Quản Trị Viên Hệ Thống', 'admin@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0905123456', 'admin', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
(2, 'Nguyễn Văn Nam (Chủ trọ)', 'nam.owner@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0905888999', 'landlord', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
(3, 'Lê Thị Thu Lan', 'lan.landlord@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0914222333', 'landlord', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
(4, 'Trần Minh Đức', 'duc.landlord@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0983444555', 'landlord', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
(5, 'Nguyễn Văn Hùng', 'hung.nguyen@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0978111222', 'tenant', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'),
(6, 'Trần Thị Mai', 'mai.tran@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0912333444', 'tenant', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
(7, 'Lê Hoàng Long', 'long.le@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0905555666', 'tenant', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'),
(8, 'Phạm Quỳnh Như', 'nhu.pham@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0934777888', 'tenant', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150'),
(9, 'Võ Minh Trí', 'tri.vo@example.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQmG6FeE6J6oXoX5sWf6e', '0988999000', 'tenant', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150');

-- LANDLORDS
INSERT INTO landlords (id, user_id, company_name, address, identity_number) VALUES
(1, 2, 'Hệ thống Nhà trọ An Cư Đà Nẵng', '120 Ngô Thì Nhậm, Q. Liên Chiểu, Đà Nẵng', '048085001234'),
(2, 3, 'Nhà trọ Sinh viên & Căn hộ Xanh', '88 Phan Tứ, Q. Ngũ Hành Sơn, Đà Nẵng', '048089005678'),
(3, 4, 'Chung cư Mini Minh Đức', '210 Đường 2 Tháng 9, Q. Hải Châu, Đà Nẵng', '048078009012');

-- BOARDING HOUSES
INSERT INTO boarding_houses (id, landlord_id, name, address, description, city, district, ward, latitude, longitude) VALUES
(1, 1, 'Dãy trọ Hòa Khánh (Gần ĐH Bách Khoa)', '120 Ngô Thì Nhậm, P. Hòa Khánh Nam, Q. Liên Chiểu, Đà Nẵng', 'Dãy trọ an ninh, sạch sẽ, giờ giấc tự do, cách cổng trường ĐH Bách Khoa và ĐH Sư Phạm 500m.', 'Đà Nẵng', 'Liên Chiểu', 'Hòa Khánh Nam', 16.073800, 108.149900),
(2, 1, 'Nhà trọ Cẩm Lệ (Cách Mạng Tháng 8)', '45 Cách Mạng Tháng 8, P. Khuê Trung, Q. Cẩm Lệ, Đà Nẵng', 'Nhà trọ khép kín mới xây, khu dân cư yên tĩnh, gần chợ Cẩm Lệ và siêu thị Mega Market.', 'Đà Nẵng', 'Cẩm Lệ', 'Khuê Trung', 16.018500, 108.209400),
(3, 2, 'Căn hộ Mini Sinh viên Ngũ Hành Sơn', '88 Phan Tứ, P. Mỹ An, Q. Ngũ Hành Sơn, Đà Nẵng', 'Ngay phố ẩm thực Phan Tứ, gần ĐH Kinh Tế (DUE), cách biển Mỹ Khê 800m.', 'Đà Nẵng', 'Ngũ Hành Sơn', 'Mỹ An', 16.051200, 108.243500),
(4, 2, 'Khu trọ KTX Tôn Đức Thắng', '450 Tôn Đức Thắng, P. Hòa Minh, Q. Liên Chiểu, Đà Nẵng', 'Dãy phòng trọ gác lửng giá sinh viên, gần bến xe trung tâm Đà Nẵng.', 'Đà Nẵng', 'Liên Chiểu', 'Hòa Minh', 16.061000, 108.167000),
(5, 3, 'Chung cư Mini Cao cấp Hải Châu', '210 Đường 2 Tháng 9, P. Hòa Cường Bắc, Q. Hải Châu, Đà Nẵng', 'Căn hộ dịch vụ cao cấp ngay trung tâm thành phố, gần cầu Trần Thị Lý và các trường đại học lớn.', 'Đà Nẵng', 'Hải Châu', 'Hòa Cường Bắc', 16.042000, 108.224000),
(6, 3, 'Dãy trọ Thanh Khê', '520 Điện Biên Phủ, P. Thanh Khê Đông, Q. Thanh Khê, Đà Nẵng', 'Gần công viên 29/3 và siêu thị Co.opmart, giao thông thuận tiện.', 'Đà Nẵng', 'Thanh Khê', 'Thanh Khê Đông', 16.064500, 108.192000);

-- ROOMS
INSERT INTO rooms (id, boarding_house_id, title, description, price, area, floor, room_type, status, is_published, available_from, amenities, note) VALUES
(101, 1, 'Phòng P.101 - Phòng đơn full nội thất có gác lửng', 'Phòng tầng 1 khép kín sạch sẽ, có gác lửng đúc kiên cố, sẵn điều hòa và bình nóng lạnh mới 100%.', 2500000.00, 20.00, 1, 'private', 'rented', TRUE, '2026-01-01', 'Điều hòa, Gác lửng, Nóng lạnh, Wifi tốc độ cao, Chỗ để xe riêng', 'Hợp đồng dài hạn đến hết năm 2026'),
(102, 1, 'Phòng P.102 - Phòng khép kín ban công thoáng mát', 'Phòng tầng 1 có ban công riêng, cửa sổ đón gió mát, giờ giấc tự do không chung chủ.', 2200000.00, 18.00, 1, 'private', 'rented', TRUE, '2026-02-15', 'Wifi tốc độ cao, Nóng lạnh, Ban công, Giờ giấc tự do', NULL),
(103, 1, 'Phòng P.103 - Phòng trọ tiện nghi gần cổng trường ĐHBK', 'Phòng mới dọn dẹp sạch sẽ, tường ốp gạch men cao cấp, có sẵn quạt trần, móc áo và kệ bếp.', 2000000.00, 18.00, 1, 'private', 'available', TRUE, '2026-08-01', 'Wifi tốc độ cao, Nóng lạnh, Chỗ để xe riêng, Camera an ninh', 'Phòng sạch sẵn sàng vào ở ngay'),
(201, 1, 'Phòng P.201 - Phòng đôi có máy lạnh & tủ lạnh mini', 'Phòng tầng 2 rộng rãi thích hợp cho 2 bạn sinh viên hoặc người đi làm ở ghép.', 3200000.00, 25.00, 2, 'shared', 'rented', TRUE, '2025-09-01', 'Điều hòa, Tủ lạnh, Gác lửng, Nóng lạnh, Wifi tốc độ cao', 'Ở 2 bạn sinh viên Bách Khoa'),
(202, 1, 'Phòng P.202 - Studio cao cấp cửa sổ lớn view thoáng', 'Phòng Studio tầng 2 trang bị giường nệm, tủ quần áo lớn, bếp nấu ăn riêng.', 3500000.00, 28.00, 2, 'studio', 'available', TRUE, '2026-08-15', 'Điều hòa, Bếp riêng, Tủ quần áo, Tủ lạnh, Máy giặt chung, Khóa vân tay', 'Khách vừa trả phòng cuối tháng trước'),
(203, 1, 'Phòng P.203 - Phòng đơn ban công view công viên', 'Phòng tầng 2 view đẹp, yên tĩnh thích hợp học tập và làm việc online.', 2400000.00, 20.00, 2, 'private', 'rented', TRUE, '2026-03-01', 'Điều hòa, Ban công, Nóng lạnh, Wifi tốc độ cao', NULL),
(301, 2, 'Phòng P.301 - Căn hộ mini 1 phòng ngủ khép kín', 'Căn hộ mini tầng 3 tách biệt phòng ngủ và phòng khách, có sofa nhỏ và bàn làm việc.', 4000000.00, 32.00, 3, 'studio', 'rented', TRUE, '2025-11-01', 'Full nội thất, Điều hòa, Máy giặt riêng, Bếp, Khóa vân tay, Smart TV', NULL),
(302, 2, 'Phòng P.302 - Phòng đơn tiện nghi gần chợ Cẩm Lệ', 'Phòng sạch sẽ, giá cả hợp lý, đường lớn ô tô vào tận cổng.', 2300000.00, 19.00, 3, 'private', 'available', TRUE, '2026-08-01', 'Wifi tốc độ cao, Nóng lạnh, Để xe tầng 1, Giờ giấc tự do', NULL),
(401, 3, 'Phòng P.401 - Studio phong cách hiện đại gần ĐH Kinh Tế', 'Phòng Studio thiết kế trẻ trung, cách ĐH Kinh Tế 300m, thuận tiện đi lại và ăn uống.', 3800000.00, 26.00, 4, 'studio', 'available', TRUE, '2026-08-10', 'Điều hòa, Tủ lạnh, Bếp từ, Tủ đồ, Khóa thẻ từ, Wifi tốc độ cao', 'Ưu tiên sinh viên hoặc chuyên viên'),
(402, 3, 'Phòng P.402 - Phòng đôi gác lửng ban công hướng biển', 'Gác lửng cao không đụng đầu, ban công ngắm phố Phan Tứ, đón gió biển mát lành.', 3200000.00, 24.00, 4, 'shared', 'available', TRUE, '2026-08-01', 'Điều hòa, Gác lửng, Nóng lạnh, Ban công, Máy giặt chung', NULL),
(501, 4, 'Phòng P.101 - Phòng giá rẻ cho sinh viên gần bến xe', 'Phòng gọn gàng, điện nước giá nhà nước, an ninh trật tự tốt.', 1800000.00, 16.00, 1, 'private', 'available', TRUE, '2026-08-01', 'Wifi tốc độ cao, Quạt treo tường, Chỗ để xe trong nhà', 'Giá rẻ nhất khu vực'),
(601, 5, 'Phòng P.501 - Căn hộ Studio cao cấp view sông Hàn', 'Căn hộ dịch vụ trung tâm Hải Châu đầy đủ tiện nghi tiêu chuẩn khách sạn, có thang máy.', 4500000.00, 35.00, 5, 'studio', 'available', TRUE, '2026-08-01', 'Thang máy, Điều hòa Inverter, Tủ lạnh Side by side, Máy giặt riêng, Ban công kính', 'Căn góc 2 mặt thoáng');

-- ROOM IMAGES
INSERT INTO room_images (room_id, image_url, is_primary) VALUES
(101, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', TRUE),
(101, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', FALSE),
(102, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', TRUE),
(103, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', TRUE),
(103, 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800', FALSE),
(201, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', TRUE),
(202, 'https://images.unsplash.com/photo-1502005229762-ee1afd597405?w=800', TRUE),
(203, 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', TRUE),
(301, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800', TRUE),
(302, 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800', TRUE),
(401, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', TRUE),
(402, 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', TRUE),
(501, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', TRUE),
(601, 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', TRUE);

-- TENANTS
INSERT INTO tenants (id, user_id, landlord_id, full_name, phone, email, id_card, identity_number, hometown, job, emergency_contact, note) VALUES
(1, 5, 1, 'Nguyễn Văn Hùng', '0978111222', 'hung.nguyen@example.com', '048201009876', '048201009876', 'Quảng Nam', 'Kỹ sư phần mềm FPT Software', 'Bố: 0905111333', 'Khách ở lịch sự, đóng tiền đúng hạn ngày 05'),
(2, 6, 1, 'Trần Thị Mai', '0912333444', 'mai.tran@example.com', '048202008765', '048202008765', 'Thừa Thiên Huế', 'Kế toán viên', 'Mẹ: 0914444555', 'Ở 1 mình, yên tĩnh'),
(3, 7, 1, 'Lê Hoàng Long', '0905555666', 'long.le@example.com', '048203007654', '048203007654', 'Đà Nẵng', 'Sinh viên ĐH Bách Khoa', 'Bố: 0905666777', 'Ở chung cùng bạn học'),
(4, 8, 1, 'Phạm Quỳnh Như', '0934777888', 'nhu.pham@example.com', '048204006543', '048204006543', 'Quảng Ngãi', 'Nhân viên văn phòng', 'Chị gái: 0935888999', 'Làm việc giờ hành chính'),
(5, 9, 1, 'Võ Minh Trí', '0988999000', 'tri.vo@example.com', '048205005432', '048205005432', 'Gia Lai', 'Kỹ sư cầu đường', 'Anh trai: 0988111000', 'Thường đi công tác cuối tuần');

-- CONTRACTS
INSERT INTO contracts (id, contract_number, room_id, tenant_id, landlord_id, start_date, end_date, deposit_amount, rent_amount, status, note) VALUES
(1, 'HD-2026-101', 101, 1, 1, '2026-01-01', '2026-12-31', 2500000.00, 2500000.00, 'active', 'Tiền cọc 1 tháng, thanh toán từ ngày 01-05 hàng tháng'),
(2, 'HD-2026-102', 102, 2, 1, '2026-02-15', '2027-02-14', 2200000.00, 2200000.00, 'active', 'Hợp đồng 1 năm'),
(3, 'HD-2026-201', 201, 3, 1, '2025-09-01', '2026-08-31', 3200000.00, 3200000.00, 'active', 'Đã ký gia hạn hợp đồng năm 2'),
(4, 'HD-2026-203', 203, 4, 1, '2026-03-01', '2027-02-28', 2400000.00, 2400000.00, 'active', 'Thanh toán chuyển khoản định kỳ'),
(5, 'HD-2026-301', 301, 5, 1, '2025-11-01', '2026-10-31', 4000000.00, 4000000.00, 'active', 'Bao gồm trọn gói dịch vụ bảo dưỡng máy lạnh');

-- UTILITY BILLS
INSERT INTO utility_bills (
    id, bill_number, room_id, tenant_id, landlord_id, month,
    room_fee, old_electric_meter, new_electric_meter, electricity_units, electric_rate, electricity_amount,
    old_water_meter, new_water_meter, water_units, water_rate, water_amount,
    internet_fee, trash_fee, other_fee, other_fee_note, total_amount, status, payment_method, due_date, paid_at, note
) VALUES
(1, 'BILL-202608-101', 101, 1, 1, '2026-08-01',
 2500000.00, 1420, 1485, 65, 3500.00, 227500.00,
 110, 116, 6, 15000.00, 90000.00,
 100000.00, 30000.00, 0.00, NULL, 2947500.00, 'paid', 'banking', '2026-08-10', '2026-08-05 09:30:00', 'Đã nhận chuyển khoản qua Vietcombank'),

(2, 'BILL-202608-102', 102, 2, 1, '2026-08-01',
 2200000.00, 890, 940, 50, 3500.00, 175000.00,
 75, 79, 4, 15000.00, 60000.00,
 100000.00, 30000.00, 0.00, NULL, 2565000.00, 'paid', 'banking', '2026-08-10', '2026-08-07 14:15:00', 'Thanh toán qua mã QR'),

(3, 'BILL-202608-201', 201, 3, 1, '2026-08-01',
 3200000.00, 2100, 2210, 110, 3500.00, 385000.00,
 180, 188, 8, 15000.00, 120000.00,
 100000.00, 30000.00, 0.00, NULL, 3835000.00, 'unpaid', NULL, '2026-08-25', NULL, 'Đã gửi phiếu thu qua tin nhắn Zalo'),

(4, 'BILL-202608-203', 203, 4, 1, '2026-08-01',
 2400000.00, 1050, 1115, 65, 3500.00, 227500.00,
 90, 95, 5, 15000.00, 75000.00,
 100000.00, 30000.00, 0.00, NULL, 2832500.00, 'unpaid', NULL, '2026-08-25', NULL, NULL),

(5, 'BILL-202608-301', 301, 5, 1, '2026-08-01',
 4000000.00, 3400, 3520, 120, 3500.00, 420000.00,
 240, 248, 8, 15000.00, 120000.00,
 100000.00, 30000.00, 0.00, NULL, 4670000.00, 'paid', 'banking', '2026-08-10', '2026-08-04 18:00:00', 'Thanh toán sớm');

-- PAYMENTS
INSERT INTO payments (id, bill_id, tenant_id, amount, payment_method, payment_date, status) VALUES
(1, 1, 1, 2947500.00, 'banking', '2026-08-05', 'success'),
(2, 2, 2, 2565000.00, 'banking', '2026-08-07', 'success'),
(3, 5, 5, 4670000.00, 'banking', '2026-08-04', 'success');

-- NOTIFICATIONS & MESSAGES
INSERT INTO notifications (id, user_id, title, message, is_read) VALUES
(1, 2, 'Hóa đơn đã được thanh toán', 'Khách thuê Nguyễn Văn Hùng (P.101) đã thanh toán hóa đơn T8/2026 số tiền 2.947.500 đ.', TRUE),
(2, 2, 'Khách hàng quan tâm phòng trọ', 'Có khách hàng vừa xem tin đăng phòng Studio P.202 tại Hòa Khánh.', FALSE);

INSERT INTO messages (id, sender_id, receiver_id, room_id, content, is_read) VALUES
(1, 5, 2, 101, 'Chào chú Nam, cháu vừa chuyển khoản tiền phòng tháng 8 rồi ạ!', TRUE),
(2, 2, 5, 101, 'Chú nhận được rồi nhé Hùng, cảm ơn cháu.', TRUE);
