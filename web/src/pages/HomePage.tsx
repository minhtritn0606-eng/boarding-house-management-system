import { Link } from 'react-router-dom'
import { useRooms } from '../context/RoomContext'
import RoomCard from '../components/RoomCard'

export default function HomePage() {
  const { rooms } = useRooms()

  const availableRooms = rooms.filter((r) => r.status !== 'rented')
  const newest = [...availableRooms]
    .sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || ''))
    .slice(0, 4)
  const cheap = [...availableRooms].sort((a, b) => a.price - b.price).slice(0, 4)

  return (
    <main>
      <section className="hero large-hero">
        <div className="hero-inner">
          <div className="hero-text">
            <h1>Tìm phòng trọ nhanh — an toàn — minh bạch</h1>
            <p>
              BoardingHouse tổng hợp hàng trăm phòng trọ, studio và căn hộ mini với hình ảnh thực tế, thông tin chủ trọ
              rõ ràng và tiện nghi được liệt kê đầy đủ. So sánh, lọc và đặt lịch xem trực tiếp ngay trên web.
            </p>
            <div className="hero-cta-group">
              <Link to="/rooms" className="cta">Tìm phòng ngay</Link>
              <Link to="/create-room" className="cta-secondary">Đăng tin cho thuê ➔</Link>
            </div>
          </div>
          <div className="hero-features">
            <div className="feature-card">
              <h4>Hàng ngàn lựa chọn</h4>
              <p>Phòng từ nhiều chủ nhà, nhiều mức giá, phù hợp sinh viên và người đi làm.</p>
            </div>
            <div className="feature-card">
              <h4>Thông tin minh bạch</h4>
              <p>Địa chỉ, diện tích, tiện nghi, liên hệ chủ trọ — mọi thứ đều rõ ràng.</p>
            </div>
            <div className="feature-card">
              <h4>Dành cho chủ trọ</h4>
              <p>Đăng tin miễn phí, tiếp cận hàng ngàn người thuê mỗi ngày.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>Cách thức hoạt động</h2>
        <div className="steps">
          <div className="step">
            <strong>1</strong>
            <h4>Tìm kiếm & Lọc</h4>
            <p>Sử dụng bộ lọc để thu hẹp khu vực, giá, diện tích, loại phòng theo ý muốn.</p>
          </div>
          <div className="step">
            <strong>2</strong>
            <h4>Xem chi tiết</h4>
            <p>Nhấn vào phòng để xem ảnh, mô tả, tiện nghi, trạng thái và vị trí bản đồ.</p>
          </div>
          <div className="step">
            <strong>3</strong>
            <h4>Liên hệ & Đặt lịch</h4>
            <p>Gửi yêu cầu xem phòng — chủ trọ sẽ liên hệ bạn trực tiếp để xác nhận.</p>
          </div>
        </div>
      </section>

      <section className="featured">
        <div className="section-header-row">
          <h3>Phòng mới đăng</h3>
          <Link to="/rooms" className="see-all-link">Xem tất cả →</Link>
        </div>
        <div className="featured-grid">
          {newest.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <section className="featured">
        <div className="section-header-row">
          <h3>Phòng giá rẻ</h3>
          <Link to="/rooms" className="see-all-link">Xem tất cả →</Link>
        </div>
        <div className="featured-grid">
          {cheap.map((r) => (
            <RoomCard key={r.id} room={r} />
          ))}
        </div>
      </section>

      <section className="mission">
        <h2>Về chúng tôi</h2>
        <p>
          BoardingHouse được xây dựng nhằm hỗ trợ người tìm nhà tiếp cận thông tin minh bạch, giảm rủi ro và tiết kiệm thời gian.
          Chúng tôi kết nối người thuê với chủ nhà đáng tin cậy, cung cấp bộ lọc mạnh mẽ và trải nghiệm đặt lịch trực tiếp.
        </p>
        <ul>
          <li>Minh bạch thông tin — ảnh thật, mô tả rõ ràng</li>
          <li>Giao tiếp thuận tiện — liên hệ trực tiếp chủ trọ</li>
          <li>Tiện ích tìm kiếm — lọc theo nhiều tiêu chí</li>
        </ul>
      </section>

      <section className="faq">
        <h3>Câu hỏi thường gặp</h3>
        <details>
          <summary>Làm sao để chủ trọ đăng bài cho thuê?</summary>
          <p>Nhấn vào nút "Đăng tin" trên thanh điều hướng hoặc "Đăng nhập Chủ trọ", sau đó điền thông tin phòng để đăng ngay.</p>
        </details>
        <details>
          <summary>Làm sao để người thuê đặt lịch xem phòng?</summary>
          <p>Vào trang chi tiết phòng, dùng form "Liên hệ / Đặt lịch" để gửi yêu cầu — chủ trọ sẽ gọi lại.</p>
        </details>
        <details>
          <summary>Phải đăng ký tài khoản mới xem được phòng không?</summary>
          <p>Không cần — người thuê có thể xem đầy đủ thông tin và gửi yêu cầu mà không cần đăng nhập.</p>
        </details>
      </section>
    </main>
  )
}
