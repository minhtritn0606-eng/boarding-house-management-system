const nodemailer = require('nodemailer');

// Tạo transporter gửi email từ cấu hình biến môi trường
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const rawUser = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;

  if (!rawUser || !rawPass) {
    return null; // Không có cấu hình SMTP -> Dùng chế độ mô phỏng (Console Mock)
  }

  let user = rawUser.trim();
  if (user && !user.includes('@')) {
    user = `${user}@gmail.com`;
  }
  const pass = rawPass.replace(/\s+/g, '');

  // Tối ưu hóa riêng cho dịch vụ Gmail
  if (host.includes('gmail.com') || user.endsWith('@gmail.com')) {
    return {
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      }),
      user,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    }),
    user,
  };
}

/**
 * Gửi email thông báo tài khoản đã được Admin phê duyệt thành công
 */
async function sendApprovalEmail({ toEmail, fullName, role }) {
  const roleName = role === 'landlord' ? 'Chủ nhà trọ (Landlord)' : role === 'poster' ? 'Người đăng bài (Poster)' : 'Thành viên';
  const loginUrl = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/login` : 'http://localhost:5173/login';

  const subject = '🎉 [Xác nhận] Tài khoản của bạn đã được Quản trị viên phê duyệt thành công';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin: 20px 0; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { color: #64748b; font-weight: 500; }
        .info-value { font-weight: 600; color: #0f172a; }
        .btn-wrapper { text-align: center; margin: 32px 0; }
        .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HỆ THỐNG QUẢN LÝ NHÀ TRỌ</h1>
          <p>Boarding House Management System</p>
        </div>
        <div class="content">
          <div class="greeting">Xin chào ${fullName || 'Quý khách'},</div>
          <p>Ban Quản trị xin trân trọng thông báo yêu cầu đăng ký tài khoản của bạn trên hệ thống đã được <strong>xét duyệt và kích hoạt thành công</strong>.</p>
          
          <div class="info-box">
            <div class="info-row">
              <span class="info-label">Email tài khoản:</span>
              <span class="info-value">${toEmail}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Vai trò kích hoạt:</span>
              <span class="info-value" style="color: #2563eb;">${roleName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Trạng thái:</span>
              <span class="info-value" style="color: #10b981;">Đã kích hoạt (Active)</span>
            </div>
          </div>

          <p>Hiện tại bạn đã có thể truy cập vào hệ thống để bắt đầu đăng tin phòng trọ hoặc quản lý dãy trọ và khách thuê của mình.</p>

          <div class="btn-wrapper">
            <a href="${loginUrl}" class="btn" target="_blank">Đăng Nhập Ngay</a>
          </div>

          <p style="font-size: 13px; color: #64748b;">Nếu nút bấm trên không hoạt động, bạn có thể sao chép liên kết sau vào trình duyệt:<br>
            <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p>Email này được gửi tự động từ Hệ thống Quản lý Nhà trọ. Vui lòng không trả lời trực tiếp email này.</p>
          <p>&copy; 2026 Boarding House Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const smtpSetup = getTransporter();

  if (!smtpSetup) {
    console.log('\n============================================================');
    console.log('📨 [MOCK EMAIL SERVICE] CẤU HÌNH SMTP CHƯA ĐƯỢC THIẾT LẬP');
    console.log(`To: ${toEmail} (${fullName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Vai trò kích hoạt: ${roleName}`);
    console.log(`Link đăng nhập: ${loginUrl}`);
    console.log('============================================================\n');
    return { success: true, mode: 'mock' };
  }

  const { transporter, user: smtpUser } = smtpSetup;
  const fromEmail = process.env.EMAIL_FROM || `"Boarding House System" <${smtpUser}>`;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
    });
    console.log(`✅ [EMAIL SENT] Đã gửi mail phê duyệt tới: ${toEmail} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, mode: 'smtp' };
  } catch (error) {
    console.error('❌ [EMAIL ERROR] Gửi email phê duyệt thất bại:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi email thông báo tài khoản bị từ chối
 */
async function sendRejectionEmail({ toEmail, fullName, reason }) {
  const subject = '⚠️ [Thông báo] Kết quả xét duyệt tài khoản trên Hệ thống Quản lý Nhà trọ';

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #334155; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06); }
        .header { background: #b91c1c; color: #ffffff; padding: 28px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .content { padding: 32px 24px; line-height: 1.6; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 16px; }
        .reason-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 16px; margin: 20px 0; color: #991b1b; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HỆ THỐNG QUẢN LÝ NHÀ TRỌ</h1>
        </div>
        <div class="content">
          <div class="greeting">Xin chào ${fullName || 'Quý khách'},</div>
          <p>Ban Quản trị rất tiếc phải thông báo rằng yêu cầu đăng ký tài khoản của bạn trên hệ thống chưa được phê duyệt tại thời điểm này.</p>
          
          <div class="reason-box">
            <strong>Lý do từ chối:</strong><br>
            ${reason || 'Thông tin đăng ký chưa đầy đủ hoặc không hợp lệ theo quy định của hệ thống.'}
          </div>

          <p>Nếu bạn cho rằng có sự nhầm lẫn hoặc cần hỗ trợ thêm, vui lòng liên hệ với bộ phận chăm sóc khách hàng qua email quản trị.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Boarding House Management System. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const smtpSetup = getTransporter();

  if (!smtpSetup) {
    console.log('\n============================================================');
    console.log('📨 [MOCK EMAIL SERVICE] THÔNG BÁO TỪ CHỐI TÀI KHOẢN');
    console.log(`To: ${toEmail} (${fullName})`);
    console.log(`Lý do: ${reason}`);
    console.log('============================================================\n');
    return { success: true, mode: 'mock' };
  }

  const { transporter, user: smtpUser } = smtpSetup;
  const fromEmail = process.env.EMAIL_FROM || `"Boarding House System" <${smtpUser}>`;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId, mode: 'smtp' };
  } catch (error) {
    console.error('❌ [EMAIL ERROR] Gửi email từ chối thất bại:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail,
};
