const express = require('express');
const router = express.Router();
const { authenticateToken, optionalAuth } = require('../middlewares/authMiddleware');
const {
  createAppointmentHandler,
  listAppointmentsHandler,
  updateAppointmentStatusHandler,
  deleteAppointmentHandler,
} = require('../controllers/appointmentController');

// Public route: any visitor on Web can book a viewing appointment (optional auth if logged in)
router.post('/', optionalAuth, createAppointmentHandler);

// Authenticated routes: landlord manages appointments
router.get('/', authenticateToken, listAppointmentsHandler);
router.patch('/:id/status', authenticateToken, updateAppointmentStatusHandler);
router.delete('/:id', authenticateToken, deleteAppointmentHandler);

module.exports = router;
