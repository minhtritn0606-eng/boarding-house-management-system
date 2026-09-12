const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createAppointmentHandler,
  listAppointmentsHandler,
  updateAppointmentStatusHandler,
  deleteAppointmentHandler,
} = require('../controllers/appointmentController');

// Public route: any visitor on Web can book a viewing appointment
router.post('/', createAppointmentHandler);

// Authenticated routes: landlord manages appointments
router.get('/', authenticateToken, listAppointmentsHandler);
router.patch('/:id/status', authenticateToken, updateAppointmentStatusHandler);
router.delete('/:id', authenticateToken, deleteAppointmentHandler);

module.exports = router;
