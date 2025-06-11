const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Badge = require('../models/badge');
const UserProgress = require('../models/userprogress');
const Exercise = require('../models/exercise');
const Category = require('../models/category');
const Group = require('../models/group');

const { Op } = require('sequelize');

// @desc    Obtener perfil del usuario actual
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: req.user.role === 'student' ? [{
                model: Group,
                as: 'studentGroups',
                attributes: ['id', 'name', 'code'],
                through: { attributes: [] }
            }] : []
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar si han pasado más de 24 horas desde la última actividad
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastStreak = user.lastStreak ? new Date(user.lastStreak) : null;
        if (lastStreak) {
            lastStreak.setHours(0, 0, 0, 0);

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (lastStreak.getTime() < yesterday.getTime()) {
                user.streak = 0;
                await user.save();
            }
        }

        // Preparar datos del usuario
        const userData = user.toJSON();

        // Si es estudiante, agregar el grupo
        if (req.user.role === 'student') {
            userData.group = userData.studentGroups?.[0] || null;
            delete userData.studentGroups;
        }

        res.status(200).json({
            success: true,
            data: {
                ...userData,
                streak: user.streak,
                lastActive: user.lastActive,
                lastStreak: user.lastStreak
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor'
        });
    }
};

// @desc    Obtener lista de estudiantes (todos o por grupo)
// @route   GET /api/users/students
// @route   GET /api/users/students?groupId=:groupId
// @access  Private
exports.getStudents = async (req, res) => {
    try {
        const { groupId } = req.query;
        let students;

        if (groupId) {
            // Verificar que el grupo existe y pertenece al profesor
            // const group = await Group.findOne({
            //     where: {
            //         id: groupId,
            //         teacherId: req.user.id
            //     }
            // });

            // if (!group) {
            //     return res.status(404).json({
            //         success: false,
            //         error: 'Grupo no encontrado o no tienes permisos sobre él'
            //     });
            // }

            // Obtener estudiantes del grupo específico
            students = await User.findAll({
                include: [{
                    model: Group,
                    as: 'studentGroups',
                    where: { id: groupId },
                    attributes: []
                }],
                where: {
                    role: 'student'
                },
                attributes: ['id', 'username', 'name', 'email', 'level', 'xp'],
                order: [['name', 'ASC']]
            });
        } else {
            // Si no se proporciona groupId, traer todos los estudiantes
            students = await User.findAll({
                where: {
                    role: 'student'
                },
                attributes: ['id', 'username', 'name', 'email', 'level', 'xp'],
                order: [['name', 'ASC']]
            });
        }

        res.status(200).json({
            success: true,
            count: students.length,
            data: students
        });
    } catch (error) {
        console.error('Error getting students:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener la lista de estudiantes'
        });
    }
};

// @desc    Actualizar perfil del usuario
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        const { username, name, email, currentPassword, newPassword } = req.body;

        // Verificar si se intenta cambiar la contraseña
        if (currentPassword) {
            // Verificar que la contraseña actual es correcta
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'La contraseña actual es incorrecta'
                });
            }

            // Si se proporciona una nueva contraseña, actualizarla
            if (newPassword) {
                if (newPassword.length < 6) {
                    return res.status(400).json({
                        success: false,
                        error: 'La nueva contraseña debe tener al menos 6 caracteres'
                    });
                }

                // La contraseña será hasheada por los hooks definidos en el modelo
                user.password = newPassword;
            }
        }

        // Actualizar otros campos
        if (username) user.username = username;
        if (name) user.name = name;
        if (email) {
            // Verificar si el email ya está en uso por otro usuario
            const existingUser = await User.findOne({
                where: {
                    email,
                    id: { [Op.ne]: user.id }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Este email ya está en uso'
                });
            }
            user.email = email;
        }

        await user.save();

        // Devolver usuario actualizado sin la contraseña
        const updatedUser = user.toJSON();
        delete updatedUser.password;

        res.status(200).json({
            success: true,
            data: updatedUser
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor',
            message: error.message
        });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Badge,
                    as: 'badges',
                    through: { attributes: ['earnedAt'] }
                },
                {
                    model: UserProgress,
                    as: 'progresses',
                    include: [{
                        model: Exercise,
                        as: 'exercise',
                        include: [{
                            model: Category,
                            as: 'category'
                        }]
                    }]
                }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Calcular estadísticas - Corregido para usar el alias correcto 'progresses'
        const stats = {
            totalExercises: user.progresses ? user.progresses.length : 0,
            totalBadges: user.badges ? user.badges.length : 0,
            currentStreak: user.streak,
            currentLevel: user.level,
            totalXP: user.xp,
            exercisesByDifficulty: {
                'Fácil': 0,
                'Medio': 0,
                'Difícil': 0
            },
            exercisesByCategory: {},
            recentActivity: user.progresses ?
                user.progresses
                    .filter(progress => progress.exercise && progress.exercise.category)
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .slice(0, 5)
                    .map(progress => ({
                        exercise: progress.exercise.title,
                        category: progress.exercise.category.name,
                        completed: progress.completed || false,
                        completedAt: progress.completedAt,
                        timeSpent: progress.timeTaken || 0
                    })) : []
        };

        // Calcular ejercicios por dificultad y categoría
        if (user.progresses) {
            user.progresses.forEach(progress => {
                if (progress.exercise && progress.exercise.category) { // Validación adicional
                    stats.exercisesByDifficulty[progress.exercise.difficulty]++;

                    const categoryName = progress.exercise.category.name;
                    stats.exercisesByCategory[categoryName] =
                        (stats.exercisesByCategory[categoryName] || 0) + 1;
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    level: user.level,
                    xp: user.xp,
                    streak: user.streak,
                    lastActive: user.lastActive
                },
                badges: user.badges,
                stats
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas del usuario'
        });
    }
};

exports.getWeeklyStats = async (req, res) => {
    try {
        // Get date range for the current week (Sunday to Saturday)
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(today);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End on Saturday
        endOfWeek.setHours(23, 59, 59, 999);

        // Get user progress for the week
        const weeklyProgress = await UserProgress.findAll({
            where: {
                UserId: req.user.id,
                completed: true,
                completedAt: {
                    [Op.between]: [startOfWeek, endOfWeek]
                }
            },
            include: [{
                model: Exercise,
                as: 'exercise', // Add the alias here
                attributes: ['id', 'title', 'difficulty', 'xpReward'],
                required: true
            }],
            order: [['completedAt', 'ASC']]
        });

        // Initialize daily stats
        const dailyStats = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateKey = date.toISOString().split('T')[0];
            dailyStats[dateKey] = {
                date: dateKey,
                exercisesCompleted: 0,
                totalXP: 0,
                exercises: []
            };
        }

        // Process weekly progress
        weeklyProgress.forEach(progress => {
            if (progress.exercise && progress.completedAt) {  // Add null check here
                const dateKey = progress.completedAt.toISOString().split('T')[0];
                if (dailyStats[dateKey]) {
                    dailyStats[dateKey].exercisesCompleted++;
                    dailyStats[dateKey].totalXP += progress.exercise.xpReward || 0;
                    dailyStats[dateKey].exercises.push({
                        id: progress.exercise.id,
                        title: progress.exercise.title,
                        difficulty: progress.exercise.difficulty,
                        xpReward: progress.exercise.xpReward
                    });
                }
            }
        });

        res.status(200).json({
            success: true,
            data: Object.values(dailyStats)
        });

    } catch (error) {
        console.error('Error in getWeeklyStats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas semanales'
        });
    }
};

exports.getUserStatsById = async (req, res) => {
    try {
        // Verificar si el usuario solicitante es admin o profesor
        if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para ver las estadísticas de otros usuarios'
            });
        }

        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            include: [
                {
                    model: Badge,
                    as: 'badges',
                    through: { attributes: ['earnedAt'] }
                },
                {
                    model: UserProgress,
                    as: 'progresses',
                    include: [{
                        model: Exercise,
                        as: 'exercise',
                        include: [{
                            model: Category,
                            as: 'category'
                        }]
                    }]
                },
                {
                    model: Group,
                    as: 'studentGroups',
                    attributes: ['id', 'name', 'code'],
                    through: { attributes: [] }
                }
            ],
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Calcular estadísticas
        const stats = {
            totalExercises: user.progresses ? user.progresses.length : 0,
            completedExercises: user.progresses ?
                user.progresses.filter(p => p.completed).length : 0,
            totalBadges: user.badges ? user.badges.length : 0,
            currentStreak: user.streak,
            currentLevel: user.level,
            totalXP: user.xp,
            exercisesByDifficulty: {
                'Fácil': 0,
                'Medio': 0,
                'Difícil': 0
            },
            exercisesByCategory: {},
            detailedProgress: user.progresses ?
                user.progresses
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .map(progress => ({
                        exerciseId: progress.exercise.id,
                        exercise: progress.exercise.title,
                        category: progress.exercise.category.name,
                        difficulty: progress.exercise.difficulty,
                        completed: progress.completed,
                        score: progress.score,
                        timeTaken: progress.timeTaken || 0,
                        completedAt: progress.completedAt,
                        code: progress.code
                    })) : [],
            recentActivity: user.progresses ?
                user.progresses
                    .filter(p => p.completed)
                    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                    .slice(0, 5)
                    .map(progress => ({
                        exercise: progress.exercise.title,
                        category: progress.exercise.category.name,
                        completedAt: progress.completedAt,
                        timeSpent: progress.timeTaken || 0
                    })) : []
        };

        // Calcular ejercicios por dificultad y categoría
        if (user.progresses) {
            user.progresses.forEach(progress => {
                if (progress.exercise && progress.completed) {
                    stats.exercisesByDifficulty[progress.exercise.difficulty]++;

                    const categoryName = progress.exercise.category.name;
                    stats.exercisesByCategory[categoryName] =
                        (stats.exercisesByCategory[categoryName] || 0) + 1;
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    level: user.level,
                    xp: user.xp,
                    streak: user.streak,
                    lastActive: user.lastActive,
                    group: user.studentGroups?.[0] || null
                },
                badges: user.badges,
                stats
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas del usuario'
        });
    }
};