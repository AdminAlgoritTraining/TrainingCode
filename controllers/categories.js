const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const { Category, Exercise, UserProgress } = require('../models');


exports.getCategoriesProgress = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no autorizado'
            });
        }

        const categories = await Category.findAll({
            include: [{
                model: Exercise,
                as: 'exercises',
                include: [{
                    model: UserProgress,
                    as: 'progresses',
                    where: { UserId: req.user.id },
                    required: false
                }]
            }],
        });

        if (!categories || categories.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron categorías'
            });
        }

        const categoriesWithProgress = categories.map(category => {
            const exercises = category.exercises || [];

            const stats = {
                total: exercises.length,
                completed: exercises.filter(ex =>
                    ex.progresses &&
                    ex.progresses.length > 0 &&
                    ex.progresses[0].completed
                ).length,
                totalXP: exercises.reduce((sum, ex) => {
                    if (ex.progresses &&
                        ex.progresses.length > 0 &&
                        ex.progresses[0].completed) {
                        return sum + (ex.xpReward || 0);
                    }
                    return sum;
                }, 0)
            };

            return {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                icon: category.icon,
                order: category.order,
                progress: {
                    totalExercises: stats.total,
                    completedExercises: stats.completed,
                    percentage: stats.total > 0
                        ? Math.round((stats.completed / stats.total) * 100)
                        : 0,
                    totalXP: stats.totalXP
                },
                isUnlocked: category.order === 1
            };
        });

        return res.status(200).json({
            success: true,
            data: categoriesWithProgress
        });

    } catch (error) {
        console.error('Error in getCategoriesProgress:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener el progreso de las categorías'
        });
    }
};