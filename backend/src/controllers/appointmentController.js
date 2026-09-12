const {
  createAppointment,
  listAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} = require('../models/appointmentModel');

async function createAppointmentHandler(req, res) {
  try {
    const { roomId, visitorName, phone, viewingDate, viewingTime, note } = req.body;

    if (!roomId || !visitorName || !phone || !viewingDate || !viewingTime) {
      return res.status(400).json({
        message: 'Vui lòng cung cấp đầy đủ: Phòng, Họ tên, Số điện thoại, Ngày và Giờ xem phòng',
      });
    }

    const appointment = await createAppointment({
      roomId: Number(roomId),
      visitorName: visitorName.trim(),
      phone: phone.trim(),
      viewingDate,
      viewingTime: viewingTime.trim(),
      note: note ? note.trim() : '',
    });

    return res.status(201).json({
      message: 'Đặt lịch xem phòng thành công! Chủ trọ sẽ liên hệ xác nhận sớm nhất.',
      appointment,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({
      message: 'Không thể tạo yêu cầu đặt lịch hẹn',
      error: error.message,
    });
  }
}

async function listAppointmentsHandler(req, res) {
  try {
    const userId = req.user?.id;
    const { status, roomId, landlordId } = req.query;

    const appointments = await listAppointments({
      userId,
      landlordId,
      roomId: roomId ? Number(roomId) : undefined,
      status,
    });

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error('Error listing appointments:', error);
    return res.status(500).json({
      message: 'Không thể lấy danh sách lịch hẹn',
      error: error.message,
    });
  }
}

async function updateAppointmentStatusHandler(req, res) {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Trạng thái là bắt buộc' });
    }

    const appointment = await updateAppointmentStatus(id, status);
    return res.status(200).json({
      message: 'Cập nhật trạng thái lịch hẹn thành công',
      appointment,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Không thể cập nhật lịch hẹn',
      error: error.message,
    });
  }
}

async function deleteAppointmentHandler(req, res) {
  try {
    const id = Number(req.params.id);
    await deleteAppointment(id);
    return res.status(200).json({ message: 'Đã xóa lịch hẹn xem phòng' });
  } catch (error) {
    return res.status(500).json({
      message: 'Không thể xóa lịch hẹn',
      error: error.message,
    });
  }
}

module.exports = {
  createAppointmentHandler,
  listAppointmentsHandler,
  updateAppointmentStatusHandler,
  deleteAppointmentHandler,
};
