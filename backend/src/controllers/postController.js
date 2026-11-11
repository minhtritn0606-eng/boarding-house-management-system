const {
  createPost,
  findPostById,
  listPosts,
  updatePost,
  deletePost,
  incrementViewCount,
  incrementContactClicks,
} = require('../models/postModel');
const { getPool } = require('../config/database');
const { moderatePost } = require('../services/aiModeratorService');
const { createNotification, getLandlordUserIdByPostId } = require('../models/notificationModel');

async function createPostHandler(req, res) {
  try {
    const userId = req.user?.id || 2;
    const {
      title,
      description,
      price,
      area,
      roomType,
      address,
      city,
      district,
      latitude,
      longitude,
      amenities,
      images,
      contactPhone,
      contactName,
      contact,
      ownerName,
      boardingHouseId,
    } = req.body;

    if (!title || price === undefined || !address) {
      return res.status(400).json({ message: 'Tiêu đề, giá thuê và địa chỉ là bắt buộc' });
    }

    const pool = await getPool();

    // Lấy thông tin số điện thoại và tên người liên hệ chính xác
    let resolvedPhone = contactPhone || contact || req.user?.phone;
    let resolvedName = contactName || ownerName || req.user?.fullName;
    if (!resolvedPhone || !resolvedName) {
      const [uRows] = await pool.query('SELECT phone, full_name FROM users WHERE id = ?', [userId]);
      if (uRows.length > 0) {
        if (!resolvedPhone) resolvedPhone = uRows[0].phone || '';
        if (!resolvedName) resolvedName = uRows[0].full_name || 'Chủ trọ';
      }
    }

    // 1. Tìm hoặc tạo hồ sơ landlord cho user này
    let landlordId;
    const [landlords] = await pool.query('SELECT id FROM landlords WHERE user_id = ?', [userId]);
    if (landlords.length > 0) {
      landlordId = landlords[0].id;
    } else {
      const [lRes] = await pool.query(
        'INSERT INTO landlords (user_id, company_name, address) VALUES (?, ?, ?)',
        [userId, 'Chủ trọ', address || 'TP. Đà Nẵng']
      );
      landlordId = lRes.insertId;
    }

    // 2. Tìm hoặc liên kết boarding_house
    let targetHouseId = boardingHouseId ? Number(boardingHouseId) : null;
    if (!targetHouseId) {
      const [existingHouses] = await pool.query(
        'SELECT id FROM boarding_houses WHERE landlord_id = ? LIMIT 1',
        [landlordId]
      );
      if (existingHouses.length > 0) {
        targetHouseId = existingHouses[0].id;
      } else {
        const [hRes] = await pool.query(
          'INSERT INTO boarding_houses (landlord_id, name, address, city, district, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [landlordId, `Nhà trọ ${address.slice(0, 30)}`, address, city || 'Đà Nẵng', district || 'Liên Chiểu', latitude || null, longitude || null]
        );
        targetHouseId = hRes.insertId;
      }
    }

    // 3. Chạy AI kiểm duyệt nội dung & phòng chống tin ảo / phá giá
    let moderation = {
      riskScore: 0,
      reviewStatus: 'approved',
      postStatus: 'active',
      flags: [],
      summary: 'Thông tin bài đăng hợp lệ.',
    };
    try {
      moderation = await moderatePost({
        landlordId,
        title,
        description,
        price: Number(price),
        area: area ? Number(area) : 20,
        roomType: roomType || 'private',
        address,
        city: city || 'Đà Nẵng',
        district: district || '',
        images: Array.isArray(images) ? images : [],
      });
    } catch (modErr) {
      console.warn('Lỗi AI kiểm duyệt bài đăng (vẫn tiếp tục tạo bài):', modErr.message);
    }

    // 4. Tạo bài đăng mới trong bảng posts
    const post = await createPost({
      landlordId,
      boardingHouseId: targetHouseId,
      title,
      description,
      price: Number(price),
      area: area ? Number(area) : 20,
      roomType: roomType || 'private',
      address,
      city: city || 'Đà Nẵng',
      district: district || '',
      latitude: latitude !== undefined ? Number(latitude) : null,
      longitude: longitude !== undefined ? Number(longitude) : null,
      amenities,
      contactPhone: resolvedPhone || '0905 888 999',
      contactName: resolvedName || 'Chủ trọ',
      images: Array.isArray(images) ? images : [],
      aiRiskScore: moderation.riskScore,
      aiReviewStatus: moderation.reviewStatus,
      aiFlags: moderation.flags,
      aiSummary: moderation.summary,
      status: moderation.postStatus,
    });

    let message = 'Tạo bài đăng thành công và đã được duyệt hiển thị!';
    if (moderation.reviewStatus === 'pending_review') {
      message = 'Bài đăng đã được tạo và đang ở trạng thái Chờ duyệt (AI phát hiện một số thông tin cần quản trị viên xác minh).';
      try {
        await createNotification({
          userId,
          title: 'Bài đăng đang chờ duyệt',
          message: `Bài đăng "${title}" đã được ghi nhận và đang chờ Quản trị viên xác minh: ${moderation.summary}`,
          type: 'pending',
          link: `/my-rooms`,
        });
      } catch (e) {}
    } else if (moderation.reviewStatus === 'rejected') {
      message = 'Bài đăng bị tạm dừng xuất bản do phát hiện dấu hiệu vi phạm (phá giá hoặc trùng lặp thông tin).';
      try {
        await createNotification({
          userId,
          title: 'Bài đăng bị tạm dừng xuất bản',
          message: `Bài đăng "${title}" bị tạm dừng do hệ thống AI phát hiện nghi vấn vi phạm: ${moderation.summary}`,
          type: 'rejected',
          link: null,
        });
      } catch (e) {}
    } else {
      try {
        await createNotification({
          userId,
          title: 'Bài đăng đã xuất bản thành công',
          message: `Bài đăng "${title}" đã được AI kiểm duyệt hợp lệ và hiển thị công khai trên website.`,
          type: 'approved',
          link: `/rooms/${post.id}`,
        });
      } catch (e) {}
    }

    return res.status(201).json({ message, post, room: post, moderation });
  } catch (error) {
    console.error('Lỗi khi tạo bài đăng:', error);
    return res.status(500).json({ message: 'Không thể tạo bài đăng', error: error.message });
  }
}

async function listPostsHandler(req, res) {
  try {
    const { search, city, district, minPrice, maxPrice, roomType, status, landlordId, ownerEmail, mine } = req.query;

    let userId = req.query.userId ? Number(req.query.userId) : undefined;
    if (mine === 'true' || mine === '1') {
      userId = req.user?.id;
    }

    const posts = await listPosts({
      search,
      city,
      district,
      minPrice,
      maxPrice,
      roomType,
      status,
      userId,
      landlordId: landlordId ? Number(landlordId) : undefined,
      ownerEmail,
      mine: mine === 'true' || mine === '1',
    });

    return res.status(200).json({ posts, rooms: posts }); // Alias 'rooms' để tương thích ngược 100% với Frontend
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải danh sách bài đăng', error: error.message });
  }
}

async function getPostDetailsHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    return res.status(200).json({ post, room: post }); // Alias 'room' để tương thích ngược 100% với DetailPage
  } catch (error) {
    return res.status(500).json({ message: 'Không thể tải chi tiết bài đăng', error: error.message });
  }
}

async function updatePostHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    // 1. Phân quyền và bảo vệ các trường kiểm duyệt của AI / Admin
    delete req.body.aiRiskScore;
    delete req.body.aiReviewStatus;
    delete req.body.aiFlags;
    delete req.body.aiSummary;

    // 2. Kiểm tra nếu các thông tin nhạy cảm của bài viết bị thay đổi
    const hasPriceChange = req.body.price !== undefined && Number(req.body.price) !== Number(post.price);
    const hasTitleChange = req.body.title !== undefined && req.body.title.trim() !== (post.title || '').trim();
    const hasDescChange = req.body.description !== undefined && req.body.description.trim() !== (post.description || '').trim();
    const hasAddressChange = req.body.address !== undefined && req.body.address.trim() !== (post.address || '').trim();
    const hasDistrictChange = req.body.district !== undefined && req.body.district.trim() !== (post.district || '').trim();
    const hasImagesChange = Array.isArray(req.body.images) && JSON.stringify(req.body.images) !== JSON.stringify(post.images || []);

    const isSensitiveModified = hasPriceChange || hasTitleChange || hasDescChange || hasAddressChange || hasDistrictChange || hasImagesChange;

    // 3. Quản lý trạng thái xuất bản:
    // Nếu bài đăng vốn đang ở trạng thái Chờ duyệt (pending) hoặc Bị từ chối (rejected):
    // Người dùng TUYỆT ĐỐI không thể tự ý chuyển sang 'active' / 'available'
    const isCurrentlyUnapproved =
      post.status === 'pending' ||
      post.status === 'rejected' ||
      post.aiReviewStatus === 'pending_review' ||
      post.aiReviewStatus === 'rejected';

    if (isCurrentlyUnapproved) {
      // Giữ nguyên trạng thái chưa duyệt, không cho phép client ghi đè thành active/available
      req.body.status = post.status === 'rejected' ? 'rejected' : 'pending';
    }

    // 4. Nếu có thông tin nhạy cảm thay đổi, kích hoạt AI quét lại
    let moderation = null;
    if (isSensitiveModified) {
      try {
        moderation = await moderatePost({
          landlordId: post.landlordId,
          title: req.body.title !== undefined ? req.body.title : post.title,
          description: req.body.description !== undefined ? req.body.description : post.description,
          price: req.body.price !== undefined ? Number(req.body.price) : Number(post.price),
          area: req.body.area !== undefined ? Number(req.body.area) : Number(post.area),
          roomType: req.body.roomType !== undefined ? req.body.roomType : post.roomType,
          address: req.body.address !== undefined ? req.body.address : post.address,
          city: req.body.city !== undefined ? req.body.city : post.city,
          district: req.body.district !== undefined ? req.body.district : post.district,
          images: Array.isArray(req.body.images) ? req.body.images : (post.images || []),
        });

        req.body.aiRiskScore = moderation.riskScore;
        req.body.aiFlags = moderation.flags;
        req.body.aiSummary = moderation.summary;

        if (isCurrentlyUnapproved) {
          // Nếu bài vốn đang pending/rejected:
          if (moderation.reviewStatus === 'rejected') {
            req.body.aiReviewStatus = 'rejected';
            req.body.status = 'rejected';
          } else {
            // Tiếp tục giữ pending chờ Admin duyệt xác nhận
            req.body.aiReviewStatus = 'pending_review';
            req.body.status = 'pending';
          }
        } else {
          // Nếu bài trước đó đã được duyệt (approved / active):
          if (moderation.reviewStatus !== 'approved') {
            // Phát hiện sửa đổi có rủi ro -> Lập tức thu hồi xuất bản công khai
            req.body.aiReviewStatus = moderation.reviewStatus;
            req.body.status = moderation.postStatus; // 'pending' hoặc 'rejected'
          } else {
            req.body.aiReviewStatus = 'approved';
          }
        }
      } catch (modErr) {
        console.warn('Lỗi AI kiểm duyệt khi cập nhật bài đăng:', modErr.message);
      }
    } else if (!isCurrentlyUnapproved && req.body.status) {
      // Nếu bài đã duyệt hợp lệ và người dùng chỉ toggle giữa 'active' (hoặc 'available') và 'rented':
      const requested = req.body.status.toLowerCase();
      if (requested === 'rented') {
        req.body.status = 'rented';
      } else {
        req.body.status = 'active';
      }
    }

    const updatedPost = await updatePost(postId, req.body);

    let message = 'Cập nhật bài đăng thành công!';
    if (updatedPost.status === 'pending' || updatedPost.aiReviewStatus === 'pending_review') {
      message = 'Bài đăng đã được lưu nhưng đang ở trạng thái Chờ duyệt do hệ thống AI phát hiện thông tin cần xác minh.';
    } else if (updatedPost.status === 'rejected' || updatedPost.aiReviewStatus === 'rejected') {
      message = 'Bài đăng bị tạm dừng xuất bản do phát hiện dấu hiệu vi phạm (phá giá hoặc trùng lặp).';
    }

    try {
      const ownerUserId = req.user?.id || (await getLandlordUserIdByPostId(postId))?.userId;
      if (ownerUserId) {
        if (updatedPost.status === 'rejected' || updatedPost.aiReviewStatus === 'rejected') {
          await createNotification({
            userId: ownerUserId,
            title: 'Bài đăng cập nhật bị tạm dừng',
            message: `Nội dung mới của "${updatedPost.title}" bị phát hiện nghi vấn: ${updatedPost.aiSummary || 'Dữ liệu bất thường'}.`,
            type: 'rejected',
            link: null,
          });
        } else if (updatedPost.status === 'pending' || updatedPost.aiReviewStatus === 'pending_review') {
          await createNotification({
            userId: ownerUserId,
            title: 'Bài đăng cập nhật đang chờ duyệt',
            message: `Bài đăng "${updatedPost.title}" đã lưu thay đổi và đang chờ Quản trị viên phê duyệt lại.`,
            type: 'pending',
            link: `/my-rooms`,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Lỗi gửi thông báo khi cập nhật bài:', notifErr.message);
    }

    return res.status(200).json({
      message,
      post: updatedPost,
      room: updatedPost,
      moderation: moderation || {
        riskScore: updatedPost.aiRiskScore,
        reviewStatus: updatedPost.aiReviewStatus,
        flags: updatedPost.aiFlags,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể cập nhật bài đăng', error: error.message });
  }
}

async function deletePostHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    await deletePost(postId);
    return res.status(200).json({ message: 'Đã xóa bài đăng thành công' });
  } catch (error) {
    return res.status(500).json({ message: 'Không thể xóa bài đăng', error: error.message });
  }
}

async function recheckPostAIHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const post = await findPostById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài đăng' });
    }

    const moderation = await moderatePost({
      id: postId,
      landlordId: post.landlordId || 1,
      title: post.title,
      description: post.description,
      price: post.price,
      area: post.area,
      roomType: post.roomType,
      address: post.address,
      city: post.city,
      district: post.district,
      images: post.images,
    });

    const updatedPost = await updatePost(postId, {
      aiRiskScore: moderation.riskScore,
      aiReviewStatus: moderation.reviewStatus,
      aiFlags: moderation.flags,
      aiSummary: moderation.summary,
      status: moderation.postStatus,
    });

    return res.status(200).json({
      message: 'Đã hoàn tất quét AI kiểm duyệt lại bài đăng',
      moderation,
      post: updatedPost,
      room: updatedPost,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi quét lại AI cho bài đăng', error: error.message });
  }
}

async function trackPostViewHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    if (!postId) return res.status(400).json({ error: 'ID bài đăng không hợp lệ' });
    await incrementViewCount(postId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function trackPostContactHandler(req, res) {
  try {
    const postId = Number(req.params.id);
    const { type = 'call' } = req.body || {};
    if (!postId) return res.status(400).json({ error: 'ID bài đăng không hợp lệ' });
    await incrementContactClicks(postId, type);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createPostHandler,
  listPostsHandler,
  getPostDetailsHandler,
  updatePostHandler,
  deletePostHandler,
  recheckPostAIHandler,
  trackPostViewHandler,
  trackPostContactHandler,
};
