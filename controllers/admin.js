const { User, Exercise, Category, UserProgress } = require('../models');

exports.getAdminStats = async (req, res) => {
    try {
        const stats = {
            users: await User.count(),
            exercises: await Exercise.count(),
            categories: await Category.count(),
            completedExercises: await UserProgress.count({
                where: { completed: true }
            })
        };

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas de administrador'
        });
    }
};