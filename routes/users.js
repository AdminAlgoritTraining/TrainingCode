const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    getUserProfile,
    updateUserProfile,
    getUserStats,
    getWeeklyStats,
    getStudents,
    getUserStatsById // Asegúrate de que esta función esté importada desde el controlador correspondiente
} = require('../controllers/users');

// Rutas privadas (requieren autenticación)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/stats', protect, getUserStats);
router.get('/stats/weekly', protect, getWeeklyStats);
router.get('/students', protect, getStudents);
router.get('/stats/:userId', protect, getUserStatsById); // Añade esta línea

module.exports = router;