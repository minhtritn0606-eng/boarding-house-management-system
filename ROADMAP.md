# Roadmap - Boarding House Management System

## Mục tiêu chung
Hoàn thành một hệ thống quản lý nhà trọ toàn diện, bao gồm:
- Backend RESTful API cho quản lý chủ trọ, phòng, khách thuê, hợp đồng và hóa đơn.
- Website tìm phòng cho người dùng phổ thông.
- Ứng dụng di động cho chủ trọ quản lý nhà trọ và khách thuê.
- Đồng bộ dữ liệu, xác thực JWT, và trải nghiệm UI/UX mượt mà.

---

## Giai đoạn 1 - Nền tảng dự án và thiết kế hệ thống (1 tuần)
### Tuần 1
- Hoàn thiện tài liệu dự án: README, overview, mục tiêu và yêu cầu chức năng.
- Thiết kế cấu trúc thư mục cho `backend`, `web`, `mobile`, `database`, `docs`.
- Hoàn thiện mô hình dữ liệu MySQL: nhà trọ, phòng, khách thuê, hợp đồng, hóa đơn, người dùng, quyền.
- Tạo schema SQL ban đầu và script khởi tạo database trong `database/schema.sql`.
- Khởi tạo backend Express, cấu hình kết nối MySQL, hỗ trợ môi trường `.env`.

---

## Giai đoạn 2 - Backend cốt lõi (1 tuần)
### Tuần 2
- Xây dựng hệ thống xác thực: đăng ký, đăng nhập, JWT, bảo mật mật khẩu với bcrypt.
- Thực hiện phân quyền theo vai trò: Visitor, Landlord.
- API quản lý nhà trọ và phòng:
  - Thêm/sửa/xóa nhà trọ
  - Thêm/sửa/xóa phòng
  - Đăng tin phòng cho thuê
- API quản lý khách thuê và hợp đồng:
  - Thêm/sửa/xóa khách thuê
  - Tạo/hủy hợp đồng thuê
- API quản lý hóa đơn và tiện ích:
  - Thêm/sửa/xóa hóa đơn
  - Liệt kê hóa đơn theo hợp đồng/khách thuê
- API lấy danh sách phòng, chi tiết phòng, tìm kiếm và lọc theo vị trí, giá cả, loại phòng.

---

## Giai đoạn 3 - Website cho người tìm phòng (1 tuần)
### Tuần 3
- Xây dựng giao diện trang chủ và danh sách phòng với React + Vite.
- Tạo chức năng tìm kiếm và lọc phòng theo giá, khu vực, loại phòng.
- Tạo trang chi tiết phòng, hiển thị ảnh, mô tả và thông tin liên hệ.
- Kết nối Google Maps API để hiển thị vị trí phòng.
- Tạo form liên hệ/booking đơn giản cho khách hàng.
- Thực hiện xác thực người dùng cơ bản nếu cần cho website.

---

## Giai đoạn 4 - Ứng dụng di động chủ trọ (1 tuần)
### Tuần 4
- Khởi tạo dự án React Native.
- Xây dựng màn hình đăng nhập/đăng ký cho chủ trọ.
- Xây dựng màn hình quản lý nhà trọ và phòng:
  - Danh sách nhà trọ
  - Danh sách phòng
  - Chỉnh sửa thông tin phòng
- Xây dựng màn hình quản lý khách thuê và hợp đồng.
- Xây dựng màn hình quản lý hóa đơn và tiện ích.
- Thêm màn hình dashboard hiển thị thống kê cơ bản.

---

## Giai đoạn 5 - Hoàn thiện, kiểm thử và triển khai (1 tuần)
### Tuần 5
- Kiểm thử chức năng backend, website và mobile:
  - Kiểm tra API theo yêu cầu
  - Test các luồng đăng nhập, đăng tin, quản lý hợp đồng, hóa đơn
- Sửa lỗi và tối ưu hiệu suất cơ bản.
- Hoàn thiện documentation:
  - Cập nhật README
  - Hướng dẫn chạy backend, website, mobile
- Chuẩn bị tài liệu demo và báo cáo.
- Nếu có thời gian dư, triển khai demo lên hosting tĩnh / máy chủ hoặc Expo.

---

## Mốc quan trọng
1. Thiết kế database và backend cơ bản hoàn thành
2. API xác thực và quản lý phòng hoạt động
3. Website tìm phòng hiển thị được dữ liệu thực tế
4. Mobile app chủ trọ quản lý nhà trọ cơ bản
5. Kiểm thử hoàn chỉnh và tài liệu dự án sẵn sàng

---

## Phương pháp làm việc
- Chia nhỏ nhiệm vụ theo mỗi giai đoạn.
- Mỗi phần hoàn thành nên có commit rõ ràng.
- Ưu tiên làm xong backend cơ bản trước, sau đó mới làm UI.
- Dùng comment/issue trên GitHub nếu cần theo dõi tiến độ.

---

## Lịch đề xuất
- Tuần 1: Thiết kế và chuẩn bị
- Tuần 2: Hoàn thiện backend
- Tuần 3: Xây dựng website
- Tuần 4: Xây dựng mobile app
- Tuần 5: Kiểm thử và hoàn thiện
