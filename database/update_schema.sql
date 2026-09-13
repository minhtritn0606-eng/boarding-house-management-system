-- ==============================================================================
-- Script bổ sung và đồng bộ các trường dữ liệu cho Boarding House Management System
-- Tương thích hoàn toàn giữa MySQL, Backend Express, Web React & Mobile Expo
-- ==============================================================================

USE boarding_house_db;

-- 1. BẢNG PHÒNG TRỌ (rooms)
-- Bổ sung: diện tích phòng, danh sách tiện ích, cờ xuất bản bài đăng, ngày bắt đầu cho thuê
ALTER TABLE rooms 
    ADD COLUMN IF NOT EXISTS area DECIMAL(8, 2) DEFAULT NULL COMMENT 'Diện tích phòng (m2)',
    ADD COLUMN IF NOT EXISTS amenities TEXT DEFAULT NULL COMMENT 'Danh sách tiện ích dạng JSON hoặc chuỗi phân tách',
    ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Trạng thái công khai tin đăng',
    ADD COLUMN IF NOT EXISTS floor INT DEFAULT 1 COMMENT 'Tầng của phòng',
    ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL COMMENT 'Ghi chú nội bộ cho chủ trọ';

-- 2. BẢNG KHÁCH THUÊ (tenants)
-- Bổ sung: quê quán, nghề nghiệp, ghi chú, mã phòng hiện tại
ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS identity_number VARCHAR(50) DEFAULT NULL COMMENT 'Số CCCD/CMND',
    ADD COLUMN IF NOT EXISTS hometown VARCHAR(150) DEFAULT NULL COMMENT 'Quê quán / Tỉnh thành',
    ADD COLUMN IF NOT EXISTS job VARCHAR(100) DEFAULT NULL COMMENT 'Nghề nghiệp',
    ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL COMMENT 'Ghi chú về khách thuê';

-- 3. BẢNG HỢP ĐỒNG (contracts)
-- Bổ sung: tiền đặt cọc, mã hợp đồng hiển thị, ngày lập hợp đồng
ALTER TABLE contracts 
    ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50) DEFAULT NULL COMMENT 'Mã hợp đồng ví dụ HD-2026-001',
    ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Tiền cọc phòng',
    ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL COMMENT 'Điều khoản bổ sung';

-- 4. BẢNG HÓA ĐƠN & TIỆN ÍCH (utility_bills / bills)
-- Bổ sung đầy đủ các chỉ số điện (cũ, mới, thành tiền), nước (cũ, mới, thành tiền), phí mạng, phí rác và phương thức thanh toán
ALTER TABLE utility_bills 
    ADD COLUMN IF NOT EXISTS bill_number VARCHAR(50) DEFAULT NULL COMMENT 'Mã hóa đơn',
    ADD COLUMN IF NOT EXISTS room_fee DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Tiền thuê phòng tháng',
    ADD COLUMN IF NOT EXISTS old_electric_meter INT DEFAULT 0 COMMENT 'Chỉ số điện cũ (kWh)',
    ADD COLUMN IF NOT EXISTS new_electric_meter INT DEFAULT 0 COMMENT 'Chỉ số điện mới (kWh)',
    ADD COLUMN IF NOT EXISTS electric_rate DECIMAL(10, 2) DEFAULT 3500.00 COMMENT 'Đơn giá điện / kWh',
    ADD COLUMN IF NOT EXISTS old_water_meter INT DEFAULT 0 COMMENT 'Chỉ số nước cũ (m3)',
    ADD COLUMN IF NOT EXISTS new_water_meter INT DEFAULT 0 COMMENT 'Chỉ số nước mới (m3)',
    ADD COLUMN IF NOT EXISTS water_rate DECIMAL(10, 2) DEFAULT 15000.00 COMMENT 'Đơn giá nước / m3',
    ADD COLUMN IF NOT EXISTS internet_fee DECIMAL(10, 2) DEFAULT 100000.00 COMMENT 'Tiền mạng Internet',
    ADD COLUMN IF NOT EXISTS trash_fee DECIMAL(10, 2) DEFAULT 30000.00 COMMENT 'Tiền rác / Vệ sinh',
    ADD COLUMN IF NOT EXISTS other_fee DECIMAL(12, 2) DEFAULT 0.00 COMMENT 'Phụ phí phát sinh',
    ADD COLUMN IF NOT EXISTS other_fee_note VARCHAR(255) DEFAULT NULL COMMENT 'Lý do phụ phí',
    ADD COLUMN IF NOT EXISTS payment_method ENUM('cash', 'banking') DEFAULT NULL COMMENT 'Hình thức thanh toán: Tiền mặt hoặc Chuyển khoản',
    ADD COLUMN IF NOT EXISTS note TEXT DEFAULT NULL COMMENT 'Ghi chú hóa đơn';

-- 5. NÂNG CẤP CHỈ MỤC (INDEXES) ĐỂ TĂNG TỐC ĐỘ TÌM KIẾM
CREATE INDEX IF NOT EXISTS idx_rooms_boarding_house ON rooms(boarding_house_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_room ON contracts(tenant_id, room_id);
CREATE INDEX IF NOT EXISTS idx_utility_bills_status ON utility_bills(status);

-- 6. BẢNG ĐẶT LỊCH HẸN XEM PHÒNG (viewing_requests) & THÔNG BÁO (notifications)
CREATE TABLE IF NOT EXISTS viewing_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    room_id BIGINT NOT NULL,
    landlord_id BIGINT DEFAULT NULL,
    visitor_name VARCHAR(150) NOT NULL COMMENT 'Họ và tên khách xem phòng',
    phone VARCHAR(30) NOT NULL COMMENT 'Số điện thoại / Zalo liên hệ',
    viewing_date DATE NOT NULL COMMENT 'Ngày muốn đến xem',
    viewing_time VARCHAR(50) NOT NULL COMMENT 'Khung giờ hẹn (Sáng/Chiều/Tối/Tự thỏa thuận)',
    note TEXT DEFAULT NULL COMMENT 'Ghi chú hoặc câu hỏi từ khách',
    status VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending (chờ), confirmed (đã liên hệ), completed (đã xem), cancelled (hủy)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_viewing_requests_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT 'ID của user nhận thông báo (chủ trọ/admin)',
    title VARCHAR(150) NOT NULL COMMENT 'Tiêu đề thông báo',
    message TEXT NOT NULL COMMENT 'Nội dung chi tiết thông báo',
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Trạng thái đã đọc',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_viewing_requests_landlord ON viewing_requests(landlord_id);
CREATE INDEX IF NOT EXISTS idx_viewing_requests_status ON viewing_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);

