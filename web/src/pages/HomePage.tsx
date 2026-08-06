import { Link } from 'react-router-dom'
import { sampleRooms } from '../data/sampleRooms'

export default function HomePage() {
  const newest = [...sampleRooms].sort((a, b) => (b.postedDate || '').localeCompare(a.postedDate || '')).slice(0, 4)
  const cheap = [...sampleRooms].sort((a, b) => a.price - b.price).slice(0, 4)

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
            <Link to="/rooms" className="cta">Tìm phòng ngay</Link>
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
              <h4>Đặt lịch dễ dàng</h4>
              <p>Gửi yêu cầu xem phòng — chủ trọ sẽ liên hệ trực tiếp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>Cách thức hoạt động</h2>
        <div className="steps">
          <div className="step">
            <strong>1</strong>
            <h4>Tìm</h4>
            <p>Sử dụng bộ lọc để thu hẹp khu vực, giá, diện tích, loại phòng.</p>
          </div>
          <div className="step">
            <strong>2</strong>
            <h4>Xem chi tiết</h4>
            <p>Nhấn vào phòng để xem ảnh, mô tả, tiện nghi và vị trí trên bản đồ.</p>
          </div>
          <div className="step">
            <strong>3</strong>
            <h4>Đặt lịch</h4>
            <p>Gửi yêu cầu xem phòng — chủ trọ sẽ liên hệ bạn để xác nhận.</p>
          </div>
        </div>
      </section>

      <section className="featured">
        <h3>Phòng mới đăng</h3>
        <div className="featured-grid">
          {newest.map((r) => (
            <Link to={`/rooms/${r.id}`} key={r.id} className="featured-card">
              <img src={r.images?.[0] || ''} alt={r.title} />
              <div className="featured-body">
                <div className="title">{r.title}</div>
                <div className="meta">{r.district} • {r.area} m²</div>
                <div className="price">{r.price.toLocaleString('vi-VN')}₫</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="featured">
        <h3>Phòng giá rẻ</h3>
        <div className="featured-grid">
          {cheap.map((r) => (
            <Link to={`/rooms/${r.id}`} key={r.id} className="featured-card">
              <img src={r.images?.[0] || ''} alt={r.title} />
              <div className="featured-body">
                <div className="title">{r.title}</div>
                <div className="meta">{r.city} • {r.district}</div>
                <div className="price">{r.price.toLocaleString('vi-VN')}₫</div>
              </div>
            </Link>
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
          <summary>Làm sao để đặt lịch xem phòng?</summary>
          <p>Vào trang chi tiết phòng, dùng form "Liên hệ / Đặt lịch" để gửi yêu cầu — chủ trọ sẽ gọi lại.</p>
        </details>
        <details>
          <summary>Phải đăng ký tài khoản không?</summary>
          <p>Không cần — người dùng có thể xem thông tin và gửi yêu cầu mà không cần đăng nhập.</p>
        </details>
      </section>
    </main>
  )
}
