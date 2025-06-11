const express = require('express');
const {
    getCategories,
    getExercisesByCategory,
    getExercise,
    verifyExercise,
    updateExercise,
    deleteExercise,
    createExercise,
    getExercisesByWeek,
    getExercisesByWeekAndOrder
} = require('../controllers/exercises');
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');

const router = express.Router();

// Rutas específicas primero
router.get('/categories', getCategories);
router.get('/category/:slug', protect, getExercisesByCategory);
router.get('/week/:week', protect, getExercisesByWeek);
router.get('/category/:slug/week/:week', protect, getExercisesByWeekAndOrder);

// Rutas con parámetros dinámicos después
router.get('/:slug/:id', protect, getExercise);
router.post('/:id/verify', protect, verifyExercise);
router.put('/:id', protect, updateExercise);
router.delete('/:id', protect, adminOnly, deleteExercise);
router.post('/', protect, createExercise);

module.exports = router;