# 🎓 TÀI LIỆU TOÀN DIỆN VỀ DỰ ÁN & HƯỚNG DẪN THUYẾT TRÌNH TRƯỚC GIẢNG VIÊN
## 🏠 BOARDING HOUSE MANAGEMENT SYSTEM (HỆ THỐNG QUẢN LÝ PHÒNG TRỌ ĐA NỀN TẢNG)

---

## 📌 PHẦN 1: TỔNG QUAN ĐỀ TÀI & BỐI CẢNH DỰ ÁN

### 1.1. Tên đề tài
* **Tên tiếng Việt:** Hệ thống Quản lý và Tìm kiếm Phòng trọ Thông minh Đa Nền tảng.
* **Tên tiếng Anh:** Boarding House Management System.
* **Mô hình giải pháp:** Fullstack Web Application + Cross-platform Mobile App + RESTful API Backend Server + Hệ quản trị CSDL MySQL + Trí tuệ nhân tạo (Google Gemini AI).

### 1.2. Tính cấp thiết & Lý do chọn đề tài
1. **Đối với người tìm trọ (Sinh viên, người đi làm):**
   - Thường gặp khó khăn khi tìm kiếm phòng trọ chính xác về vị trí, hình ảnh thực tế và giá cả minh bạch.
   - Các tin đăng trên mạng xã hội thường bị trôi bài, sai lệch giá, vị trí không rõ ràng.
   - Thiếu công cụ hỗ trợ tư vấn 24/7 theo đúng nhu cầu ngân sách và khu vực cá nhân.
2. **Đối với chủ nhà trọ:**
   - Đa số quản lý thủ công bằng sổ sách giấy tờ hoặc file Excel rời rạc.
   - Dễ nhầm lẫn, thất thoát tiền điện, nước, internet hàng tháng khi chốt số công tơ.
   - Khó khăn trong việc theo dõi hạn hợp đồng, thông tin định danh CCCD của khách thuê và quản lý danh sách cuộc hẹn xem phòng.
3. **Mục tiêu của dự án:**
   - Xây dựng một **hệ sinh thái khép kín**: Người tìm phòng sử dụng **Website** để tìm kiếm, định vị bản đồ GPS, đặt lịch hẹn và chat với AI; Chủ trọ sử dụng **Mobile App** hoặc **Web Portal** để vận hành dãy trọ, chốt hóa đơn, quản lý khách thuê; Quản trị viên (Admin) điều phối toàn sàn trên trang **Admin Dashboard**.

---

## 🏗️ PHẦN 2: KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 2.1. Mô hình kiến trúc tổng thể (3-Tier Architecture)

Hệ thống được thiết kế theo mô hình **Client - Server** phân tầng chuẩn công nghiệp, giao tiếp thông qua **RESTful API** và bảo mật bằng **JSON Web Token (JWT)**:

```
+-----------------------------------------------------------------------------------+
|                            TẦNG CLIENT (GIAO DIỆN)                                |
|                                                                                   |
|  [🌐 Web Portal] (React 19 + TypeScript + Vite)     [📱 Mobile App] (React Native)|
|  - Dành cho Khách tìm phòng & Chủ trọ               - Dành riêng cho Chủ trọ      |
|  - Tích hợp Leaflet Maps + Chatbot AI Gemini        - Chạy đa nền tảng iOS/Android|
|  - Trang Quản trị Hệ thống (Admin Dashboard)        - Sử dụng Expo Framework SDK 58|
+------------------------------------------+----------------------------------------+
                                           | HTTP Requests (JSON + Bearer JWT Token)
                                           v
+-----------------------------------------------------------------------------------+
|                        TẦNG APPLICATION SERVER (BACKEND)                          |
|                                                                                   |
|  [⚡ Node.js + Express.js RESTful API]                                             |
|  ├── Middlewares: Auth (JWT), Validation, CORS                                    |
|  ├── Controllers: Auth, House, Room, Tenant, Contract, Bill, Appointment, Admin   |
|  ├── AI Service: Tích hợp Google Gemini AI SDK (@google/genai)                    |
|  └── Data Layer: mysql2/promise Connection Pool                                   |
+------------------------------------------+----------------------------------------+
                                           | SQL Queries (Prepared Statements)
                                           v
+-----------------------------------------------------------------------------------+
|                          TẦNG CƠ SỞ DỮ LIỆU (DATABASE)                            |
|                                                                                   |
|  [🗄️ MySQL Server 8.0+]                                                           |
|  - Chuẩn hóa 10 bảng dữ liệu có ràng buộc toàn vẹn khóa ngoại (Foreign Key)       |
|  - Chỉ mục (Indexes) tối ưu hóa truy vấn tìm kiếm theo giá, trạng thái, khu vực   |
+-----------------------------------------------------------------------------------+
```

### 2.2. Chi tiết công nghệ từng tầng

| Thành phần | Công nghệ / Thư viện | Lý do lựa chọn & Vai trò thực tế trong dự án |
| :--- | :--- | :--- |
| **Backend API** | **Node.js & Express.js** | Xử lý bất đồng bộ (Asynchronous Event-driven), xử lý hàng nghìn request I/O nhanh, cú pháp gọn gàng. |
| **Bảo mật** | **JWT & Bcrypt** | Xác thực phân quyền không trạng thái (Stateless), băm mật khẩu 1 chiều chuẩn bảo mật chống tấn công Rainbow Table. |
| **Trí tuệ nhân tạo** | **Google Gemini AI** | Tích hợp thư viện `@google/genai` giúp Chatbot tự động phân tích câu hỏi người dùng, tra cứu dữ liệu phòng trong DB và phản hồi gợi ý phòng thông minh. |
| **Cơ sở dữ liệu** | **MySQL (InnoDB)** | Đảm bảo tính toàn vẹn dữ liệu ACID, quan hệ chặt chẽ giữa Chủ trọ - Dãy trọ - Phòng - Khách - Hợp đồng - Hóa đơn. Kết nối qua `mysql2/promise` Connection Pool chống SQL Injection. |
| **Frontend Web** | **React 19 + TypeScript** | Phát triển Single Page Application (SPA), Type-safe hạn chế lỗi runtime, hiệu năng render vượt trội. |
| **Build Tool Web** | **Vite** | Tốc độ biên dịch và Hot Module Replacement (HMR) cực nhanh, tối ưu dung lượng bundle production. |
| **Bản đồ số** | **Leaflet & OpenStreetMap** | Hiển thị bản đồ tương tác, ghim tọa độ vĩ độ/kinh độ (`lat`, `lng`), tự động lấy GPS người dùng để vẽ lộ trình chỉ đường đến phòng trọ. |
| **Mobile App** | **React Native + Expo SDK 58** | Viết code 1 lần chạy cả 2 nền tảng Android và iOS, giao diện mượt mà đạt chuẩn Native App, dễ dàng test trên thiết bị thật qua Expo Go. |

---

## 📂 PHẦN 3: CẤU TRÚC THƯ MỤC CỦA TOÀN BỘ DỰ ÁN

Dự án được tổ chức dạng **Monorepo** rõ ràng, module hóa cao:

```text
boarding-house-management-system/
│
├── backend/                       # MÃ NGUỒN MÁY CHỦ REST API (Node.js)
│   ├── src/
│   │   ├── config/                # Cấu hình CSDL (database.js)
│   │   ├── controllers/           # Nghiệp vụ xử lý (room, bill, contract, admin...)
│   │   ├── middlewares/           # authMiddleware kiểm tra Token JWT
│   │   ├── models/                # Truy vấn SQL trực tiếp vào MySQL
│   │   ├── routes/                # Định nghĩa các endpoint URL (/api/rooms, /api/bills...)
│   │   ├── services/              # Dịch vụ gọi Google Gemini AI (geminiService.js)
│   │   └── app.js                 # File khởi chạy chính của Backend Server
│   └── package.json
│
├── web/                           # MÃ NGUỒN GIAO DIỆN WEBSITE (React + TS + Vite)
│   ├── src/
│   │   ├── components/            # Navbar, Footer, ChatBot, MapLocationPicker...
│   │   ├── context/               # AuthContext (đăng nhập), RoomContext (dữ liệu phòng)
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Trang chủ giới thiệu, tìm kiếm nhanh
│   │   │   ├── ListingPage.tsx    # Danh sách phòng + Bộ lọc đa tiêu chí
│   │   │   ├── DetailPage.tsx     # Chi tiết phòng + Bản đồ GPS + Form đặt hẹn
│   │   │   ├── LoginPage.tsx      # Đăng nhập & Đăng ký tài khoản
│   │   │   ├── CreateRoomPage.tsx # Đăng bài cho thuê + Ghim vị trí bản đồ
│   │   │   ├── EditRoomPage.tsx   # Chỉnh sửa thông tin phòng
│   │   │   ├── MyRoomsPage.tsx    # Quản lý phòng của chủ + Quản lý lịch hẹn xem phòng
│   │   │   └── AdminDashboardPage.tsx # Bảng điều khiển quản trị viên toàn sàn
│   │   ├── services/              # Gọi API Axios/Fetch về Backend
│   │   ├── App.tsx                # Quản lý định tuyến (React Router DOM)
│   │   └── main.tsx
│   └── package.json
│
├── mobile/                        # MÃ NGUỒN ỨNG DỤNG DI ĐỘNG (React Native + Expo)
│   ├── src/
│   │   ├── components/            # BottomTabBar, Thẻ thống kê, Modal nhập điện nước
│   │   ├── context/               # AuthContext, RoomContext, TenantContext, BillContext
│   │   ├── screens/
│   │   │   ├── AuthScreen.tsx     # Đăng nhập / Đăng ký dành cho chủ trọ
│   │   │   ├── HomeScreen.tsx     # Dashboard thống kê doanh thu, tỷ lệ phòng trống
│   │   │   ├── RoomsScreen.tsx    # Quản lý danh sách phòng, đổi trạng thái phòng
│   │   │   ├── TenantsScreen.tsx  # Quản lý danh bạ khách thuê, CCCD, gọi điện trực tiếp
│   │   │   └── BillsScreen.tsx    # Chốt số điện nước, tự động tính tổng tiền, xuất hóa đơn
│   │   └── services/              # API Client kết nối Backend qua IP mạng LAN Wi-Fi
│   ├── App.tsx                    # Điều hướng TabBar di động
│   └── package.json
│
└── database/                      # CƠ SỞ DỮ LIỆU
    ├── schema.sql                 # Cấu trúc bảng và khóa ngoại CSDL chuẩn
    ├── update_schema.sql          # Script cập nhật bảng viewing_requests & notifications
    └── seed_data.sql              # Dữ liệu mẫu kiểm thử hệ thống
```

---

## 👥 PHẦN 4: 3 ĐỐI TƯỢNG TÁC NHÂN & CÁC CHỨC NĂNG CỐT LÕI

Hệ thống phân quyền rành mạch thành **3 tác nhân (Actors)** thông qua trường `role` trong CSDL:

### 4.1. Tác nhân 1: Khách tìm phòng (Visitor / Tenant - Website)
* **Khám phá & Tìm kiếm:**
  - Xem danh sách phòng trọ đang mở cho thuê (`status = 'available'`).
  - **Bộ lọc thông minh (Smart Filter):** Lọc theo khoảng giá (Dưới 2tr, 2-3.5tr, 3.5-5tr, Trên 5tr), lọc theo quận/huyện, loại phòng và tiện ích (máy lạnh, máy giặt, gác lửng, giờ giấc tự do).
* **Trang chi tiết phòng trọ đa năng:**
  - Thư viện ảnh phòng trực quan.
  - Chi tiết bảng giá: Tiền phòng, đơn giá điện/kWh, đơn giá nước/khối, internet, rác.
  - **Bản đồ số tương tác (Leaflet Maps):** Tự động phát hiện vị trí GPS hiện tại của người dùng và vẽ đường đi ngắn nhất đến nhà trọ.
* **Đặt lịch hẹn xem phòng trực tiếp (Viewing Appointment):**
  - Khách chỉ cần nhập: Họ tên, Số điện thoại/Zalo, Ngày hẹn, Khung giờ hẹn (Sáng/Chiều/Tối).
  - Yêu cầu được lưu tức thì vào bảng `viewing_requests` để chủ trọ tiếp nhận và liên hệ lại.
* **Trợ lý ảo Chatbot AI (Google Gemini):**
  - Trò chuyện ngôn ngữ tự nhiên bằng tiếng Việt 24/7.
  - Tự động quét CSDL để gợi ý phòng phù hợp với câu hỏi của khách (VD: *"Tìm cho mình phòng dưới 3 triệu ở Liên Chiểu có máy lạnh"*).

---

### 4.2. Tác nhân 2: Chủ nhà trọ (Landlord - Web Portal & Mobile App)
* **Quản lý Dãy trọ & Phòng trọ:**
  - Thêm mới phòng: Tải nhiều ảnh phòng, đặt giá, diện tích, tầng, tiện ích.
  - **Công cụ ghim vị trí tọa độ:** Bấm trực tiếp trên bản đồ để lưu vĩ độ/kinh độ chính xác của phòng trọ.
  - Bật/tắt trạng thái phòng nhanh: `Còn trống (available)` $\leftrightarrow$ `Đã thuê (rented)` chỉ với 1 chạm.
* **Tiếp nhận & Quản lý Lịch hẹn xem phòng:**
  - Xem toàn bộ danh sách khách đặt lịch hẹn từ Website.
  - Cập nhật trạng thái cuộc hẹn: *Chờ xác nhận $\rightarrow$ Đã liên hệ $\rightarrow$ Đã xem phòng $\rightarrow$ Hủy hẹn*.
  - Bấm gọi điện thoại hoặc nhắn tin Zalo trực tiếp cho khách.
* **Quản lý Khách thuê & Hợp đồng (Tenant & Contract):**
  - Lưu trữ hồ sơ định danh: Họ tên, CCCD/CMND, Số điện thoại, Quê quán, Nghề nghiệp.
  - Lập hợp đồng: Ngày bắt đầu, ngày kết thúc, số tiền đặt cọc.
* **Tự động hóa Tính tiền & Xuất hóa đơn hàng tháng (Utility Bills):**
  - Nhập **Chỉ số điện mới** và **Chỉ số nước mới**.
  - Hệ thống tự động lấy: `(Số mới - Số cũ) x Đơn giá`.
  - Tự động cộng: `Tiền phòng + Tiền điện + Tiền nước + Tiền mạng + Tiền rác + Phụ phí`.
  - Cập nhật trạng thái thu tiền: *Chưa thanh toán / Đã thanh toán (Tiền mặt hoặc Chuyển khoản)*.
* **Báo cáo tài chính (Dashboard Analytics):**
  - Báo cáo trực quan: Tổng số phòng, tỷ lệ lấp đầy, số tiền đã thu trong tháng và số công nợ chưa thu.

---

### 4.3. Tác nhân 3: Quản trị viên (Admin - Web Admin Dashboard)
* **Quản trị người dùng toàn hệ thống:** Xem toàn bộ tài khoản, lọc theo vai trò (Chủ trọ, Khách, Admin), phân quyền hoặc khóa tài khoản vi phạm.
* **Kiểm duyệt tin đăng (Moderation):** Giám sát các bài đăng phòng trọ trên sàn; có quyền duyệt bài, ẩn bài đăng hoặc xóa bài có nội dung lừa đảo/sai lệch.
* **Giám sát tài chính & Vận hành:** Thống kê tổng quan KPI toàn sàn: Tổng số phòng trọ, doanh thu hóa đơn toàn hệ thống.

---

## 🔒 PHẦN 5: CƠ CHẾ CÔ LẬP DỮ LIỆU (DATA ISOLATION)

Đây là **điểm kỹ thuật rất quan trọng** để chứng minh với giảng viên rằng hệ thống đáp ứng thực tế:
1. **Tại tầng Backend:**
   - Mỗi request từ Chủ trọ gửi lên đều kèm mã thông báo xác thực `Authorization: Bearer <JWT_Token>`.
   - Middleware `authMiddleware` giải mã token để lấy `req.user.id`.
   - Mọi câu lệnh SQL truy vấn phòng, khách thuê, hóa đơn đều gắn chặt điều kiện:
     ```sql
     SELECT * FROM rooms WHERE landlord_id = ?;
     SELECT * FROM utility_bills WHERE landlord_id = ?;
     ```
   - **Đảm bảo:** Chủ trọ A tuyệt đối không thể xem, sửa hoặc xóa dữ liệu phòng, khách thuê hay doanh thu của Chủ trọ B.
2. **Tại tầng Mobile App:**
   - Khi chủ trọ mới đăng ký tài khoản, hệ thống trả về danh sách trống (`0 phòng, 0 khách, 0 hóa đơn`). Dữ liệu hoàn toàn sạch để chủ trọ tự xây dựng hệ thống của mình.

---

## 🗄️ PHẦN 6: THIẾT KẾ CƠ SỞ DỮ LIỆU (10 BẢNG CHUẨN HÓA)

Hệ thống sử dụng CSDL quan hệ MySQL với 10 bảng nghiệp vụ chuẩn hóa:

1. **`users`**: Tài khoản người dùng (ID, Họ tên, Email, Mật khẩu băm Bcrypt, SĐT, Role: admin/landlord/tenant/visitor).
2. **`landlords`**: Thông tin mở rộng của chủ trọ (Mã chủ trọ, Địa chỉ, Tên cơ sở, CCCD).
3. **`boarding_houses`**: Danh sách dãy trọ/tòa nhà (Tên dãy, địa chỉ, quận/huyện, tọa độ lat/lng).
4. **`rooms`**: Thông tin chi tiết phòng (Số phòng, giá thuê, diện tích, tầng, tiện ích, trạng thái: available/rented/maintenance, tọa độ ghim bản đồ).
5. **`room_images`**: Lưu trữ danh sách ảnh thực tế của từng phòng trọ.
6. **`tenants`**: Thông tin hồ sơ khách thuê trọ (Họ tên, SĐT, CCCD, quê quán, nghề nghiệp).
7. **`contracts`**: Hợp đồng thuê phòng (Mã hợp đồng, ngày bắt đầu, ngày kết thúc, tiền cọc, giá thuê).
8. **`utility_bills`**: Hóa đơn hàng tháng (Chỉ số điện cũ/mới, chỉ số nước cũ/mới, đơn giá, tiền rác, internet, tổng tiền, trạng thái thanh toán).
9. **`viewing_requests`**: Danh sách khách đăng ký đặt lịch hẹn xem phòng từ website.
10. **`notifications`**: Thông báo trong hệ thống cho người dùng khi có sự kiện phát sinh.

---

## 🌟 PHẦN 7: 4 ĐIỂM NHẤN CÔNG NGHỆ GẮN LIỀN VỚI ĐIỂM SỐ CAO

Khi giảng viên hỏi *"Dự án này có điểm gì nổi bật hơn các đề tài quản lý thông thường?"*, hãy tự tin nêu 4 điểm sau:

1. **Tích hợp Trợ lý ảo AI thế hệ mới (Google Gemini AI):**
   - Không phải chatbot trả lời theo kịch bản cứng (rule-based), mà là mô hình AI hiểu ngôn ngữ tự nhiên. AI tự động đọc dữ liệu phòng thực tế trong CSDL để trả lời và gợi ý phòng chính xác theo nhu cầu khách.
2. **Hệ thống Bản đồ số tương tác (Leaflet Maps) & Chỉ đường GPS:**
   - Khách xem được phòng trọ nằm ở đâu trên bản đồ thực tế.
   - Ứng dụng tự động lấy tọa độ GPS hiện tại của người dùng và tính toán lộ trình di chuyển tới phòng trọ.
   - Chủ trọ có công cụ ghim vị trí trực quan khi tạo phòng mới.
3. **Quy trình tự động hóa Hóa đơn Điện nước (Mobile App):**
   - Giải quyết triệt để bài toán nhức nhối nhất của chủ trọ: Tự tính số điện tiêu thụ, số nước tiêu thụ theo lũy tiến đơn giá, cộng phí dịch vụ và xuất phiếu thu minh bạch.
4. **Kiến trúc Fullstack Đa Nền tảng Đầy đủ:**
   - Kết hợp mượt mà giữa **Web App (React/Vite)** cho đối tượng đại chúng và **Mobile App (React Native/Expo)** cho chủ trọ mang đi kiểm tra phòng thực tế.

---

## 🎤 PHẦN 8: KỊCH BẢN THUYẾT TRÌNH MẪU TRƯỚC HỘI ĐỒNG (5 - 7 PHÚT)

Bạn có thể trình bày theo sườn ngắn gọn và chuyên nghiệp sau:

### Lời mở đầu (1 phút):
> *"Kính thưa quý Thầy/Cô trong Hội đồng chấm báo cáo,*
> *Hôm nay em xin phép đại diện trình bày đề tài: **Hệ thống Quản lý và Tìm kiếm Phòng trọ Đa Nền tảng (Boarding House Management System)**.*
> *Xuất phát từ thực tế sinh viên và người lao động gặp rất nhiều khó khăn khi tìm kiếm phòng trọ chính xác, minh bạch; đồng thời các chủ trọ hiện nay vẫn ghi chép sổ sách thủ công dẫn đến nhầm lẫn, thất thoát tiền điện nước. Đề tài của em được xây dựng nhằm cung cấp một giải pháp toàn diện kết nối giữa Người tìm trọ, Chủ trọ và Quản trị viên hệ thống."*

### Giới thiệu Kiến trúc & Công nghệ (1.5 phút):
> *"Về mặt kiến trúc, hệ thống được thiết kế theo mô hình Client - Server 3 tầng chuẩn RESTful API:*
> *- **Backend:** Xây dựng bằng Node.js và Express.js, kết nối CSDL MySQL thông qua cơ chế Connection Pool bất đồng bộ, bảo mật xác thực bằng JWT và mã hóa mật khẩu Bcrypt.*
> *- **Frontend Website:** Xây dựng bằng React 19, TypeScript và Vite, tích hợp bản đồ Leaflet OpenStreetMap và Trợ lý AI Google Gemini.*
> *- **Ứng dụng Di động:** Phát triển bằng React Native kết hợp Expo Framework, giúp chủ trọ dễ dàng quản lý dãy trọ ngay trên điện thoại thông minh."*

### Demo Chức năng cốt lõi (3 phút):
> *- **Phân hệ Website:** Em xin demo luồng người tìm trọ: Khách hàng vào trang chủ, sử dụng bộ lọc tìm phòng theo giá và tiện ích. Khi bấm vào xem chi tiết, khách xem được ảnh thực tế, tiện nghi và bản đồ định vị GPS có lộ trình chỉ đường. Khách có thể điền Form đặt lịch xem phòng trực tiếp hoặc mở khung Chatbot AI để hỏi đáp tự nhiên.*
> *- **Phân hệ Mobile App cho Chủ trọ:** Khi chủ trọ đăng nhập vào App, màn hình Dashboard hiển thị tỷ lệ lấp đầy phòng và doanh thu tháng. Đến cuối tháng, chủ trọ chỉ cần vào mục Hóa đơn, nhập chỉ số điện mới và nước mới, ứng dụng sẽ tự động tính toán tổng tiền và xuất hóa đơn minh bạch.*
> *- **Phân hệ Quản trị (Admin):** Quản trị viên có trang Dashboard riêng để giám sát số lượng phòng, phê duyệt bài đăng và quản lý người dùng toàn hệ thống."*

### Kết luận (30 giây):
> *"Hệ thống đã hoàn thiện đầy đủ các chức năng nghiệp vụ, đảm bảo tính bảo mật và cô lập dữ liệu giữa các chủ trọ. Em xin chân thành cảm ơn quý Thầy/Cô đã lắng nghe và em rất mong nhận được những góp ý từ Hội đồng!"*

---

## ❓ PHẦN 9: BỘ CÂU HỎI PHẢN BIỆN GIẢNG VIÊN THƯỜNG HỎI & CÁCH TRẢ LỜI

#### ❓ Câu 1: Làm thế nào để đảm bảo chủ trọ này không xem được doanh thu hay dữ liệu phòng của chủ trọ khác?
* **Cách trả lời:**
  > *"Dạ thưa Thầy/Cô, hệ thống sử dụng cơ chế **Data Isolation** ở tầng Backend. Khi chủ trọ đăng nhập, server cấp một Token JWT chứa `userId`. Trong mọi API thao tác dữ liệu (lấy phòng, khách thuê, hóa đơn), Backend sẽ giải mã token và bắt buộc thêm điều kiện `WHERE landlord_id = ?` vào câu lệnh SQL. Do đó, dù người dùng có cố tình can thiệp mã yêu cầu từ giao diện thì Backend vẫn kiểm soát tuyệt đối tính cô lập dữ liệu."*

#### ❓ Câu 2: Chatbot AI hoạt động như thế nào? Có bị trả lời sai dữ liệu phòng trọ không?
* **Cách trả lời:**
  > *"Dạ thưa Thầy/Cô, Chatbot sử dụng SDK của Google Gemini AI kết hợp kỹ thuật nạp ngữ cảnh (Context Injection). Khi người dùng hỏi một câu (ví dụ 'Tìm phòng dưới 3 triệu ở Liên Chiểu'), hệ thống sẽ truy vấn dữ liệu phòng thực tế hiện có trong CSDL MySQL và đưa danh sách đó vào làm ngữ cảnh hệ thống (System Prompt) cho Gemini AI. Nhờ đó, AI chỉ phân tích và đề xuất đúng những phòng thực tế đang còn trống trong hệ thống chứ không tạo ra dữ liệu ảo."*

#### ❓ Câu 3: Bản đồ chỉ đường hoạt động như thế nào trên Website?
* **Cách trả lời:**
  > *"Dạ thưa Thầy/Cô, trên Website em sử dụng thư viện **Leaflet** kết hợp bản đồ mở OpenStreetMap. Mỗi khi chủ trọ tạo phòng, họ có thể bấm trực tiếp lên bản đồ để lưu vĩ độ và kinh độ (`latitude`, `longitude`) vào MySQL. Khi khách bấm vào chi tiết phòng, hệ thống sử dụng HTML5 Geolocation API để xin phép lấy tọa độ GPS hiện tại của khách, sau đó vẽ đường đi kết nối hai điểm tọa độ trực quan trên bản đồ."*

#### ❓ Câu 4: Cơ chế tính tiền hóa đơn điện nước có hỗ trợ trường hợp số công tơ bị quay vòng hoặc nhập sai không?
* **Cách trả lời:**
  > *"Dạ thưa Thầy/Cô, trên màn hình tạo hóa đơn, hệ thống tự động tải chỉ số điện/nước cũ từ hóa đơn tháng trước đó. Hệ thống có cơ chế kiểm tra (Validation): Chỉ số mới bắt buộc phải lớn hơn hoặc bằng chỉ số cũ. Nếu người dùng nhập sai, ứng dụng sẽ cảnh báo lỗi ngay trên giao diện trước khi cho phép lưu vào cơ sở dữ liệu."*

---

> [!TIP]
> Bạn hãy lưu tài liệu này lại. Trước buổi báo cáo từ 1 - 2 ngày, hãy đọc kỹ Phần 4 (Chức năng), Phần 7 (Điểm nhấn), Phần 8 (Kịch bản thuyết trình) và Phần 9 (Câu hỏi phản biện) để có phong thái tự tin và đạt kết quả cao nhất trước hội đồng!
