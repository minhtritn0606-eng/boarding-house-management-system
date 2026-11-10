-- ==============================================================================
-- MIGRATION: CẬP NHẬT TRƯỜNG PHÊ DUYỆT TÀI KHOẢN VÀ VAI TRÒ NGƯỜI ĐĂNG BÀI
-- ==============================================================================

USE boarding_house_db;

-- 1. Cập nhật ENUM role để hỗ trợ 'poster'
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'landlord', 'poster', 'tenant', 'visitor') NOT NULL DEFAULT 'visitor';

-- 2. Thêm các cột phê duyệt nếu chưa tồn tại
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' AFTER role,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP NULL DEFAULT NULL AFTER approval_status,
ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255) DEFAULT NULL AFTER approved_at;

-- 3. Cập nhật các tài khoản hiện có thành 'approved' để không bị khóa đăng nhập
UPDATE users 
SET approval_status = 'approved', approved_at = NOW() 
WHERE approval_status = 'pending' OR approval_status IS NULL;

-- 4. Thêm index tối ưu truy vấn tài khoản chờ duyệt
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
