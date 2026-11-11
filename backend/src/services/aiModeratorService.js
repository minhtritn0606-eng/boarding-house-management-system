const { GoogleGenAI } = require('@google/genai');
const { getPool } = require('../config/database');

/**
 * Service AI Kiểm duyệt bài đăng phòng trọ thông minh
 * Kết hợp Heuristic CSDL (trùng ảnh, trùng địa chỉ, phá giá) và Google Gemini AI
 */

/**
 * Kiểm duyệt bài đăng tự động
 * @param {Object} postData
 * @param {number} [postData.id] - ID bài đăng (nếu là cập nhật)
 * @param {number} postData.landlordId - ID chủ trọ đăng bài
 * @param {string} postData.title - Tiêu đề bài đăng
 * @param {string} postData.description - Mô tả bài đăng
 * @param {number} postData.price - Giá thuê (VNĐ/tháng)
 * @param {number} postData.area - Diện tích (m²)
 * @param {string} postData.roomType - Loại phòng (private, shared, studio...)
 * @param {string} postData.address - Địa chỉ
 * @param {string} postData.city - Thành phố
 * @param {string} postData.district - Quận / Huyện
 * @param {Array<string>} postData.images - Danh sách link ảnh
 * @returns {Promise<{ riskScore: number, reviewStatus: 'approved' | 'pending_review' | 'rejected', postStatus: 'active' | 'pending' | 'rejected', flags: string[], summary: string }>}
 */
async function moderatePost(postData) {
  const pool = await getPool();
  const flags = [];
  let dbRiskScore = 0;

  const {
    id,
    landlordId,
    title = '',
    description = '',
    price = 0,
    area = 20,
    roomType = 'private',
    address = '',
    city = 'Đà Nẵng',
    district = '',
    images = [],
  } = postData;

  const numPrice = Number(price);

  // ================= 1. KIỂM TRA TRÙNG LẶP ẢNH (Image Duplication) =================
  if (Array.isArray(images) && images.length > 0) {
    try {
      const placeholders = images.map(() => '?').join(',');
      const queryParams = [...images, landlordId];
      let queryStr = `
        SELECT p.id, p.title, p.price, p.address, u.full_name AS poster_name, pi.image_url
        FROM post_images pi
        JOIN posts p ON pi.post_id = p.id
        JOIN landlords l ON p.landlord_id = l.id
        JOIN users u ON l.user_id = u.id
        WHERE pi.image_url IN (${placeholders})
          AND p.landlord_id != ?
      `;
      if (id) {
        queryStr += ' AND p.id != ?';
        queryParams.push(id);
      }
      queryStr += ' LIMIT 3';

      const [dupImgRows] = await pool.query(queryStr, queryParams);
      if (dupImgRows.length > 0) {
        dbRiskScore += 40;
        const dupItem = dupImgRows[0];
        flags.push(
          `Phát hiện hình ảnh trùng lặp với bài đăng #${dupItem.id} ("${dupItem.title.slice(0, 40)}...") của người đăng khác (${dupItem.poster_name})`
        );
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra trùng lặp ảnh:', err.message);
    }
  }

  // ================= 2. KIỂM TRA TRÙNG ĐỊA CHỈ (Address Conflict) =================
  if (address && address.trim().length > 5) {
    try {
      const cleanAddr = address.trim().toLowerCase();
      let queryStr = `
        SELECT p.id, p.title, p.price, u.full_name AS poster_name
        FROM posts p
        JOIN landlords l ON p.landlord_id = l.id
        JOIN users u ON l.user_id = u.id
        WHERE LOWER(TRIM(p.address)) = ?
          AND p.landlord_id != ?
      `;
      const queryParams = [cleanAddr, landlordId];
      if (id) {
        queryStr += ' AND p.id != ?';
        queryParams.push(id);
      }
      queryStr += ' LIMIT 2';

      const [dupAddrRows] = await pool.query(queryStr, queryParams);
      if (dupAddrRows.length > 0) {
        dbRiskScore += 30;
        const dupAddr = dupAddrRows[0];
        flags.push(
          `Địa chỉ trùng khớp hoàn toàn với bài đăng #${dupAddr.id} của người đăng khác (${dupAddr.poster_name})`
        );
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra trùng địa chỉ:', err.message);
    }
  }

  // ================= 3. PHÁT HIỆN PHÁ GIÁ / GIÁ BẤT THƯỜNG (Price Anomaly Detection) =================
  try {
    let priceQuery = `
      SELECT AVG(price) AS avg_price, MIN(price) AS min_price, COUNT(*) AS count_posts
      FROM posts
      WHERE status = 'active'
        AND room_type = ?
    `;
    const priceParams = [roomType];

    if (district) {
      priceQuery += ' AND district = ?';
      priceParams.push(district);
    } else if (city) {
      priceQuery += ' AND city = ?';
      priceParams.push(city);
    }

    if (id) {
      priceQuery += ' AND id != ?';
      priceParams.push(id);
    }

    const [priceRows] = await pool.query(priceQuery, priceParams);
    if (priceRows.length > 0 && priceRows[0].count_posts >= 2) {
      const avgPrice = Number(priceRows[0].avg_price);

      // Nếu giá thấp hơn 50% so với giá sàn trung bình cùng khu vực
      if (numPrice > 0 && numPrice < avgPrice * 0.5) {
        dbRiskScore += 35;
        const diffPercent = Math.round(((avgPrice - numPrice) / avgPrice) * 100);
        flags.push(
          `Giá thuê (${numPrice.toLocaleString('vi-VN')}₫) thấp hơn ${diffPercent}% so với mức giá trung bình (${Math.round(avgPrice).toLocaleString('vi-VN')}₫) tại khu vực ${district || city} - Nghi vấn phá giá hoặc tin ảo`
        );
      } else if (numPrice > 0 && numPrice > avgPrice * 3.5) {
        dbRiskScore += 15;
        flags.push(
          `Giá thuê cao bất thường (${numPrice.toLocaleString('vi-VN')}₫) so với mặt bằng chung khu vực`
        );
      }
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra giá trung bình:', err.message);
  }

  // ================= 4. KIỂM TRA TỪ KHÓA DẤU HIỆU LỪA ĐẢO / CHUYỂN CỌC TRƯỚC =================
  const contentCombined = `${title} ${description}`.toLowerCase();

  const scamPatterns = [
    {
      regex: /(cọc\s*trước|chuyển\s*khoản\s*giữ\s*chỗ|không\s*cần\s*gặp|chuyển\s*tiền\s*cọc\s*gấp)/i,
      msg: 'Nội dung có cụm từ yêu cầu chuyển tiền cọc giữ chỗ trước khi xem phòng (dấu hiệu lừa cọc)',
      score: 35,
    },
    {
      regex: /(stk|số\s*tài\s*khoản|ngân\s*hàng|vietcombank|mbbank|techcombank|agribank)\s*[:=]?\s*[0-9]{7,16}/i,
      msg: 'Mô tả bài đăng chứa số tài khoản ngân hàng yêu cầu thanh toán trực tiếp',
      score: 30,
    },
  ];

  for (const p of scamPatterns) {
    if (p.regex.test(contentCombined)) {
      dbRiskScore += p.score;
      flags.push(p.msg);
    }
  }

  // ================= 5. GỌI GOOGLE GEMINI AI PHÂN TÍCH CHUYÊN SÂU =================
  let geminiRiskScore = 0;
  let aiSummary = '';

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Bạn là hệ thống AI chuyên gia kiểm duyệt nội dung tin đăng phòng trọ của hệ thống Boarding House Việt Nam.
Nhiệm vụ: Phân tích bài đăng dưới đây để phát hiện các dấu hiệu: tin ảo, tin rác, mâu thuẫn thông số, lách luật đăng số điện thoại bằng chữ, hoặc lừa đảo cọc.

THÔNG TIN BÀI ĐĂNG CẦN KIỂM DUYỆT:
- Tiêu đề: "${title}"
- Địa chỉ: "${address}, ${district}, ${city}"
- Giá thuê: ${numPrice.toLocaleString('vi-VN')} VNĐ/tháng
- Diện tích: ${area} m²
- Loại phòng: ${roomType}
- Mô tả chi tiết:
"""${description}"""
- Cảnh báo nghi vấn từ CSDL sơ bộ:
${flags.length > 0 ? flags.map((f) => `- ${f}`).join('\n') : 'Không có cảnh báo CSDL.'}

YÊU CẦU:
Trả về KẾT QUẢ DUY NHẤT dưới dạng JSON (không dùng markdown backticks, không giải thích thêm):
{
  "additional_risk_score": (số nguyên từ 0 đến 30, đánh giá mức độ bất thường về nội dung hoặc văn phong),
  "ai_flags": ["danh sách cảnh báo cụ thể nếu phát hiện thấy bất thường, nếu không có để mảng rỗng []"],
  "summary": "1 câu nhận xét tổng quan ngắn gọn về độ tin cậy của bài đăng"
}`;

      const res = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 5000)),
      ]);

      const text = (res.text || '').trim();
      const cleanJson = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed.additional_risk_score && typeof parsed.additional_risk_score === 'number') {
        geminiRiskScore = Math.max(0, Math.min(30, parsed.additional_risk_score));
      }

      if (Array.isArray(parsed.ai_flags) && parsed.ai_flags.length > 0) {
        flags.push(...parsed.ai_flags);
      }

      if (parsed.summary) {
        aiSummary = parsed.summary;
      }
    } catch (aiErr) {
      console.warn('[AI Moderator] Gemini check skipped or failed:', aiErr.message);
    }
  }

  // ================= 6. TỔNG HỢP KẾT QUẢ VÀ ĐƯA RA QUYẾT ĐỊNH =================
  const totalRiskScore = Math.min(100, dbRiskScore + geminiRiskScore);

  let reviewStatus = 'approved';
  let postStatus = 'active';

  if (totalRiskScore >= 70) {
    reviewStatus = 'rejected';
    postStatus = 'rejected';
    if (!aiSummary) {
      aiSummary = 'Bài đăng bị từ chối do có nhiều dấu hiệu vi phạm (trùng ảnh/địa chỉ hoặc phá giá nghiêm trọng).';
    }
  } else if (totalRiskScore >= 35) {
    reviewStatus = 'pending_review';
    postStatus = 'pending';
    if (!aiSummary) {
      aiSummary = 'Bài đăng có dấu hiệu nghi vấn về mức giá hoặc trùng lặp, cần quản trị viên xem xét.';
    }
  } else {
    reviewStatus = 'approved';
    postStatus = 'active';
    if (!aiSummary) {
      aiSummary = 'Thông tin bài đăng hợp lệ, giá thuê và mô tả phù hợp với thị trường.';
    }
  }

  return {
    riskScore: totalRiskScore,
    reviewStatus,
    postStatus,
    flags: Array.from(new Set(flags)), // Loại bỏ cờ trùng lặp
    summary: aiSummary,
  };
}

module.exports = {
  moderatePost,
};
