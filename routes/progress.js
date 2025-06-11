const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { adminOnly } = require('../middleware/admin');
const { UserProgress, User, Exercise } = require('../models');

// // Get all users progress (admin only)
router.get('/all', protect, async (req, res) => {
    try {
        const progress = await UserProgress.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'username', 'name', 'email'], // Added 'name' to attributes
                    as: 'user'
                },
                {
                    model: Exercise,
                    as: 'exercise',
                    attributes: ['id', 'title', 'difficulty']
                }
            ],
            order: [['completedAt', 'DESC']]
        });

        res.json({
            success: true,
            data: progress
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el progreso de todos los usuarios'
        });
    }
});

module.exports = router;