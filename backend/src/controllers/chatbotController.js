const { getPool } = require('../config/database');
const { generateGeminiChatReply } = require('../services/geminiService');

/**
 * Hàm phân tích câu hỏi người dùng bằng NLP / Rule Matching (Dự phòng Fallback)
 */
function analyzeQuery(rawText) {
  const text = (rawText || '').toLowerCase().trim();

  const criteria = {
    minPrice: null,
    maxPrice: null,
    district: null,
    city: null,
    amenities: [],
    roomType: null,
    isGeneralFaq: false,
    faqType: null,
  };

  // 1. Phân tích Giá (Price matching)
  const underPriceMatch = text.match(/(?:dưới|<|thấp hơn|tầm)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu|k|nghìn)?/i);
  if (underPriceMatch) {
    let val = parseFloat(underPriceMatch[1].replace(',', '.'));
    if (val < 20) {
      criteria.maxPrice = val * 1000000;
    } else if (val >= 100 && val < 10000) {
      criteria.maxPrice = val * 1000;
    } else {
      criteria.maxPrice = val;
    }
  }

  const rangePriceMatch = text.match(/(?:từ|khoảng)?\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)?\s*(?:đến|-|tới)\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/i);
  if (rangePriceMatch) {
    let minV = parseFloat(rangePriceMatch[1].replace(',', '.'));
    let maxV = parseFloat(rangePriceMatch[2].replace(',', '.'));
    criteria.minPrice = minV < 20 ? minV * 1000000 : minV;
    criteria.maxPrice = maxV < 20 ? maxV * 1000000 : maxV;
  }

  if (text.includes('giá rẻ') || text.includes('sinh viên')) {
    if (!criteria.maxPrice) criteria.maxPrice = 2500000;
  }

  // 2. Phân tích Quận / Khu vực (Location matching)
  if (text.includes('liên chiểu') || text.includes('hoà khánh') || text.includes('hòa khánh') || text.includes('bách khoa') || text.includes('sư phạm')) {
    criteria.district = 'Liên Chiểu';
  } else if (text.includes('hải châu')) {
    criteria.district = 'Hải Châu';
  } else if (text.includes('thanh khê')) {
    criteria.district = 'Thanh Khê';
  } else if (text.includes('sơn trà') || text.includes('cầu rồng') || text.includes('mỹ khê')) {
    criteria.district = 'Sơn Trà';
  } else if (text.includes('ngũ hành sơn') || text.includes('kinh tế')) {
    criteria.district = 'Ngũ Hành Sơn';
  } else if (text.includes('cẩm lệ')) {
    criteria.district = 'Cẩm Lệ';
  }

  // 3. Phân tích Tiện ích (Amenities matching)
  if (text.includes('máy lạnh') || text.includes('điều hòa') || text.includes('dieu hoa') || text.includes('may lanh')) {
    criteria.amenities.push('Máy lạnh');
  }
  if (text.includes('máy giặt') || text.includes('may giat')) {
    criteria.amenities.push('Máy giặt');
  }
  if (text.includes('gác lửng') || text.includes('gác') || text.includes('gac lung')) {
    criteria.amenities.push('Gác lửng');
  }
  if (text.includes('tủ lạnh') || text.includes('tu lanh')) {
    criteria.amenities.push('Tủ lạnh');
  }
  if (text.includes('ban công') || text.includes('ban cong')) {
    criteria.amenities.push('Ban công');
  }
  if (text.includes('bảo vệ') || text.includes('an ninh') || text.includes('camera')) {
    criteria.amenities.push('Bảo vệ 24/7');
  }
  if (text.includes('giờ tự do') || text.includes('tự do') || text.includes('không chung chủ')) {
    criteria.amenities.push('Giờ giấc tự do');
  }

  // 4. Phân tích Loại phòng (Room Type matching)
  if (text.includes('căn hộ') || text.includes('studio')) {
    criteria.roomType = 'apartment';
  } else if (text.includes('chung cư mini') || text.includes('mini')) {
    criteria.roomType = 'mini';
  } else if (text.includes('homestay')) {
    criteria.roomType = 'homestay';
  }

  // 5. Phân tích FAQs
  if (text.includes('liên hệ') || text.includes('gọi') || text.includes('số điện thoại') || text.includes('sđt') || text.includes('đặt lịch') || text.includes('xem phòng')) {
    criteria.isGeneralFaq = true;
    criteria.faqType = 'contact_booking';
  } else if (text.includes('điện') || text.includes('nước') || text.includes('tiền điện') || text.includes('tiền nước') || text.includes('wifi') || text.includes('rác') || text.includes('chi phí')) {
    criteria.isGeneralFaq = true;
    criteria.faqType = 'utilities';
  } else if (text.includes('cọc') || text.includes('tiền cọc') || text.includes('hợp đồng') || text.includes('thủ tục')) {
    criteria.isGeneralFaq = true;
    criteria.faqType = 'deposit_contract';
  } else if (text.includes('đăng tin') || text.includes('cho thuê') || text.includes('đăng phòng')) {
    criteria.isGeneralFaq = true;
    criteria.faqType = 'create_listing';
  } else if (text.includes('xin chào') || text.includes('hello') || text.includes('hi') || text.includes('chào')) {
    criteria.isGeneralFaq = true;
    criteria.faqType = 'greeting';
  }

  return criteria;
}

/**
 * Xử lý tin nhắn người dùng gửi đến Chatbot
 */
async function handleChatbotMessage(req, res) {
  try {
    const { message, currentRoomId } = req.body;
    const trimmedMsg = (message || '').trim();

    if (!trimmedMsg) {
      return res.status(400).json({ message: 'Nội dung tin nhắn không được để trống' });
    }

    const pool = await getPool();

    // 1. Lấy toàn bộ danh sách phòng trọ đang mở đăng từ MySQL
    const [allRooms] = await pool.query(`
      SELECT 
        r.id,
        r.title,
        r.description,
        r.price,
        r.area,
        r.room_type,
        r.status,
        r.amenities,
        bh.name AS house_name,
        bh.address AS house_address,
        bh.district AS house_district,
        bh.city AS house_city,
        u.full_name AS landlord_name,
        u.phone AS landlord_phone,
        (SELECT image_url FROM room_images WHERE room_id = r.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS primary_image
      FROM rooms r
      JOIN boarding_houses bh ON r.boarding_house_id = bh.id
      JOIN landlords l ON bh.landlord_id = l.id
      JOIN users u ON l.user_id = u.id
      WHERE (r.is_published = 1 OR r.is_published IS NULL)
    `);

    // 2. Tìm thông tin phòng hiện tại nếu người dùng đang đứng ở /rooms/:id
    let currentRoom = null;
    if (currentRoomId) {
      currentRoom = allRooms.find((r) => String(r.id) === String(currentRoomId)) || null;
    }

    // ================= BƯỚC 3: THỬ GỌI GOOGLE GEMINI AI (RAG) =================
    const geminiResult = await generateGeminiChatReply({
      message: trimmedMsg,
      currentRoom,
      allRooms,
    });

    if (geminiResult && geminiResult.reply) {
      // Ghép các ID phòng mà Gemini gợi ý với thông tin chi tiết để tạo cards
      const suggestedRooms = (geminiResult.suggestedRoomIds || [])
        .map((id) => allRooms.find((r) => r.id === Number(id)))
        .filter(Boolean)
        .slice(0, 5)
        .map((rm) => ({
          id: rm.id,
          title: rm.title,
          price: Number(rm.price),
          area: rm.area || 20,
          houseName: rm.house_name,
          district: rm.house_district || rm.house_city,
          address: rm.house_address,
          status: rm.status,
          amenities: rm.amenities,
          image: rm.primary_image || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
        }));

      return res.status(200).json({
        reply: geminiResult.reply,
        suggestedRooms,
        isGemini: true,
        quickReplies: ['Phòng dưới 2 triệu', 'Phòng gần ĐH Bách Khoa', 'Phòng có điều hòa & gác lửng', 'Cách liên hệ chủ trọ'],
      });
    }

    // ================= BƯỚC 4: FALLBACK SANG RULE-BASED DATABASE MATCHING =================
    const criteria = analyzeQuery(trimmedMsg);

    // Fallback: Hỏi về phòng hiện tại
    if (currentRoom && (trimmedMsg.includes('phòng này') || trimmedMsg.includes('ở đây') || trimmedMsg.includes('chủ trọ này') || trimmedMsg.includes('giá này'))) {
      const formattedPrice = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentRoom.price);

      let reply = `Bạn đang xem bài đăng **"${currentRoom.title}"** tại **${currentRoom.house_name}** (${currentRoom.house_address}, ${currentRoom.house_district || currentRoom.house_city}):\n\n`;
      reply += `• **Giá thuê**: ${formattedPrice}/tháng (Diện tích ~${currentRoom.area || 20}m²)\n`;
      reply += `• **Chủ trọ**: ${currentRoom.landlord_name} - SĐT: **${currentRoom.landlord_phone || 'Chưa cập nhật'}**\n`;
      reply += `• **Tiện ích**: ${currentRoom.amenities || 'Đầy đủ tiện nghi cơ bản'}\n`;
      reply += `• **Trạng thái**: ${currentRoom.status === 'rented' ? 'Đã có khách thuê' : 'Đang còn trống, sẵn sàng dọn vào'}\n\n`;
      reply += `Bạn có thể bấm vào nút **"Đặt lịch xem phòng"** hoặc gọi trực tiếp số điện thoại chủ trọ ở trên để hẹn xem phòng nhé!`;

      return res.status(200).json({
        reply,
        suggestedRooms: [],
        quickReplies: ['Giá điện nước tính sao?', 'Đặt cọc bao nhiêu?', 'Tìm phòng tương tự'],
      });
    }

    // Fallback: FAQs
    if (criteria.isGeneralFaq && criteria.faqType === 'greeting') {
      return res.status(200).json({
        reply: `Chào bạn! Tôi là **Trợ lý Tìm Phòng Trọ AI**. 🏠\n\nTôi có thể giúp bạn:\n• Tìm phòng trọ theo khoảng giá (VD: *"Phòng dưới 2 triệu"*)\n• Lọc theo khu vực quận huyện (VD: *"Phòng ở Liên Chiểu, Hải Châu"*)\n• Tìm theo tiện ích (VD: *"Có gác lửng, điều hòa, máy giặt"*)\n• Hướng dẫn liên hệ chủ trọ và đặt lịch xem phòng.\n\nBạn đang muốn tìm phòng ở khu vực nào và tầm giá bao nhiêu?`,
        suggestedRooms: [],
        quickReplies: ['Phòng dưới 2 triệu', 'Phòng gần ĐH Bách Khoa', 'Phòng có gác lửng & điều hòa', 'Cách liên hệ chủ trọ'],
      });
    }

    if (criteria.isGeneralFaq && criteria.faqType === 'contact_booking') {
      return res.status(200).json({
        reply: `Để liên hệ chủ trọ hoặc hẹn xem phòng, bạn có thể:\n\n1. **Xem số điện thoại**: Mở trang chi tiết phòng trọ bất kỳ và bấm vào nút **"Gọi điện"** hoặc **"Zalo"** ở khung thông tin chủ trọ bên phải.\n2. **Gửi form giữ phòng**: Điền họ tên, số điện thoại và ngày dự kiến chuyển vào form **"Đặt lịch xem phòng / Giữ chỗ"** ở trang chi tiết phòng để chủ trọ chủ động gọi lại cho bạn.`,
        suggestedRooms: [],
        quickReplies: ['Tìm phòng trọ giá rẻ', 'Phòng ở Liên Chiểu', 'Phòng ở Hải Châu'],
      });
    }

    // Fallback: Lọc từ danh sách allRooms
    let filtered = allRooms;
    if (criteria.minPrice !== null) filtered = filtered.filter((r) => Number(r.price) >= criteria.minPrice);
    if (criteria.maxPrice !== null) filtered = filtered.filter((r) => Number(r.price) <= criteria.maxPrice);
    if (criteria.district) {
      filtered = filtered.filter(
        (r) =>
          (r.house_district && r.house_district.toLowerCase().includes(criteria.district.toLowerCase())) ||
          (r.house_address && r.house_address.toLowerCase().includes(criteria.district.toLowerCase())) ||
          (r.house_name && r.house_name.toLowerCase().includes(criteria.district.toLowerCase()))
      );
    }
    if (criteria.amenities.length > 0) {
      filtered = filtered.filter((r) => {
        const fullTxt = `${r.amenities || ''} ${r.description || ''} ${r.title || ''}`.toLowerCase();
        return criteria.amenities.some((a) => fullTxt.includes(a.toLowerCase()));
      });
    }

    const fallbackRooms = filtered.slice(0, 5).map((rm) => ({
      id: rm.id,
      title: rm.title,
      price: Number(rm.price),
      area: rm.area || 20,
      houseName: rm.house_name,
      district: rm.house_district || rm.house_city,
      address: rm.house_address,
      status: rm.status,
      amenities: rm.amenities,
      image: rm.primary_image || 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
    }));

    let reply = '';
    if (fallbackRooms.length > 0) {
      reply = `Tôi đã tìm thấy **${fallbackRooms.length} phòng trọ phù hợp** với yêu cầu của bạn:\n\n`;
      fallbackRooms.slice(0, 3).forEach((r, idx) => {
        const p = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.price);
        reply += `${idx + 1}. **${r.title}** - **${p}/tháng** (${r.district})\n`;
      });
      reply += `\n👇 Bạn có thể bấm vào thẻ phòng bên dưới để xem chi tiết ảnh và thông tin liên hệ chủ trọ nhé:`;
    } else {
      reply = `Hiện tại chưa có phòng nào khớp hoàn toàn với yêu cầu này. Bạn có thể thử tìm với mức giá khác hoặc chọn xem danh sách phòng trên trang chủ nhé!`;
    }

    return res.status(200).json({
      reply,
      suggestedRooms: fallbackRooms,
      quickReplies: ['Phòng dưới 2 triệu', 'Phòng tại Liên Chiểu', 'Phòng có điều hòa', 'Phòng gần trung tâm'],
    });
  } catch (error) {
    console.error('Error in chatbotController:', error);
    return res.status(500).json({
      reply: 'Xin lỗi, hiện tại hệ thống trợ lý đang bận. Bạn vui lòng thử lại sau giây lát nhé!',
      suggestedRooms: [],
      error: error.message,
    });
  }
}

module.exports = {
  handleChatbotMessage,
};
