const { GoogleGenAI } = require('@google/genai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service tích hợp Google Gemini AI (Mô hình RAG)
 */

/**
 * Tạo câu trả lời thông minh bằng Gemini AI dựa trên dữ liệu phòng trọ thực tế (RAG)
 * @param {Object} params
 * @param {string} params.message - Câu hỏi của người dùng
 * @param {Object} [params.currentRoom] - Thông tin phòng người dùng đang xem (nếu có)
 * @param {Array} params.allRooms - Danh sách phòng trọ thực tế từ MySQL Database
 * @returns {Promise<{ reply: string, suggestedRoomIds: number[] } | null>}
 */
async function generateGeminiChatReply({ message, currentRoom, allRooms }) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  try {
    // 1. Chuẩn bị Context dữ liệu phòng trọ (RAG Knowledge Base)
    const formattedRooms = (allRooms || []).map((r) => ({
      id: r.id,
      tieu_de: r.title,
      gia_thue: `${new Intl.NumberFormat('vi-VN').format(r.price)} VNĐ/tháng`,
      gia_so: Number(r.price),
      dien_tich: `${r.area || 20}m²`,
      dia_chi: `${r.house_address}, ${r.house_district || r.house_city}`,
      quan_huyen: r.house_district || r.house_city,
      khu_tro: r.house_name,
      tien_ich: r.amenities || 'Tiện nghi cơ bản',
      loai_phong: r.room_type || 'Tiêu chuẩn',
      trang_thai: r.status === 'rented' ? 'Đã cho thuê' : 'Còn trống',
      chu_tro: `${r.landlord_name} (SĐT: ${r.landlord_phone || 'Chưa cập nhật'})`,
    }));

    let currentRoomContext = 'Người dùng hiện đang ở trang chủ/danh sách chung.';
    if (currentRoom) {
      currentRoomContext = `Người dùng ĐANG XEM TRỰC TIẾP phòng trọ ID #${currentRoom.id}:
- Tiêu đề: "${currentRoom.title}"
- Giá thuê: ${new Intl.NumberFormat('vi-VN').format(currentRoom.price)} VNĐ/tháng
- Địa chỉ: ${currentRoom.house_address}, ${currentRoom.house_district || currentRoom.house_city}
- Khu trọ: ${currentRoom.house_name}
- Tiện ích: ${currentRoom.amenities || 'Đầy đủ'}
- Chủ trọ: ${currentRoom.landlord_name} - SĐT: ${currentRoom.landlord_phone || 'Liên hệ qua web'}`;
    }

    // 2. System Instruction chi tiết cho Gemini
    const systemInstruction = `Bạn là "Trợ Lý Trọ AI" - chuyên viên tư vấn tìm phòng trọ thông minh, nhiệt tình và am hiểu thị trường phòng trọ tại TP. Đà Nẵng của hệ thống Boarding House.

NHIỆM VỤ CỦA BẠN:
1. Trả lời câu hỏi của người dùng bằng tiếng Việt tự nhiên, lịch sự, thân thiện và mạch lạc.
2. Dựa vào DANH SÁCH PHÒNG TRỌ THỰC TẾ được cung cấp dưới đây để tìm kiếm, gợi ý và tư vấn cho người dùng. KHÔNG tự bịa ra thông tin phòng trọ không có trong danh sách.
3. Nếu người dùng hỏi tiêu chí (giá, quận huyện, tiện ích như điều hòa, gác lửng, máy giặt, thú cưng, v.v.), hãy lọc ra các phòng phù hợp nhất từ danh sách, nêu rõ lý do tại sao phòng đó phù hợp.
4. Nếu người dùng hỏi về thủ tục, tiền cọc, điện nước, hãy giải thích rõ ràng, tận tình.
5. Ở CUỐI CÙNG của câu trả lời, hãy đính kèm danh sách các ID phòng trọ mà bạn muốn gợi ý hiển thị thẻ dưới dạng thẻ JSON chuẩn theo định dạng sau (chỉ lấy các ID có thật trong danh sách):
<!--SUGGESTED_ROOM_IDS: [1, 2, 3]-->

DANH SÁCH PHÒNG TRỌ HIỆN CÓ TRÊN HỆ THỐNG:
${JSON.stringify(formattedRooms, null, 2)}

NGỮ CẢNH HIỆN TẠI CỦA NGƯỜI DÙNG:
${currentRoomContext}`;

    let rawReply = '';
    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
      'gemini-pro',
    ];

    // ================= Cách 1: Sử dụng @google/generative-ai SDK =================
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const mName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction,
          });
          const result = await model.generateContent(message);
          rawReply = result.response.text();
          if (rawReply) {
            console.log(`[Gemini AI] Responded successfully via model: ${mName}`);
            break;
          }
        } catch (e1) {
          // Thử gọi dạng prompt gộp (tương thích mọi phiên bản)
          try {
            const modelSimple = genAI.getGenerativeModel({ model: mName });
            const promptCombo = `${systemInstruction}\n\n--- CÂU HỎI CỦA NGƯỜI DÙNG ---\n${message}`;
            const resultSimple = await modelSimple.generateContent(promptCombo);
            rawReply = resultSimple.response.text();
            if (rawReply) {
              console.log(`[Gemini AI] Responded via prompt combo on model: ${mName}`);
              break;
            }
          } catch (e2) {
            // thử model tiếp theo
          }
        }
      }
    } catch (sdkError) {
      console.warn('[Gemini AI] GenerativeAI SDK error:', sdkError.message);
    }

    // ================= Cách 2: Thử @google/genai SDK =================
    if (!rawReply) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        for (const mName of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: mName,
              contents: `${systemInstruction}\n\nCâu hỏi: ${message}`,
            });
            rawReply = response.text || '';
            if (rawReply) {
              console.log(`[Gemini AI GenAI SDK] Responded via model: ${mName}`);
              break;
            }
          } catch (e) {}
        }
      } catch (sdk2Error) {}
    }

    if (!rawReply) {
      console.warn('[Gemini AI] Could not generate response with API key, falling back to database analyzer.');
      return null;
    }

    // 4. Trích xuất danh sách suggestedRoomIds từ thẻ <!--SUGGESTED_ROOM_IDS: [...]-->
    let cleanReply = rawReply;
    let suggestedRoomIds = [];

    const match = rawReply.match(/<!--SUGGESTED_ROOM_IDS:\s*(\[[^\]]*\])\s*-->/);
    if (match) {
      try {
        suggestedRoomIds = JSON.parse(match[1]);
      } catch (e) {}
      cleanReply = rawReply.replace(match[0], '').trim();
    } else {
      formattedRooms.forEach((r) => {
        if (cleanReply.includes(`ID #${r.id}`) || cleanReply.includes(`phòng #${r.id}`)) {
          suggestedRoomIds.push(r.id);
        }
      });
    }

    return {
      reply: cleanReply,
      suggestedRoomIds: Array.from(new Set(suggestedRoomIds)),
    };
  } catch (error) {
    console.warn('[Gemini AI] Execution error:', error.message);
    return null;
  }
}

module.exports = {
  generateGeminiChatReply,
};
