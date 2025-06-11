const { sequelize } = require('../models');
const { Op } = require('sequelize');
const { Category, Exercise, UserProgress, User, Badge, UserBadge } = require('../models');
const Judge0Service = require('../services/judge0Service');

// @desc    Obtener todas las categorías
// @route   GET /api/exercises/categories
// @access  Public
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['order', 'ASC']]
        });

        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
};

// @desc    Obtener ejercicios por categoría
// @route   GET /api/exercises/category/:slug
// @access  Private
exports.getExercisesByCategory = async (req, res) => {
    try {
        const { slug } = req.params;

        // Buscar categoría
        const category = await Category.findOne({
            where: { slug }
        });

        if (!category) {
            return res.status(404).json({ success: false, error: 'Categoría no encontrada' });
        }

        // Buscar ejercicios de la categoría
        const exercises = await Exercise.findAll({
            where: { CategoryId: category.id },
            order: [['order', 'ASC']],
            attributes: {
                // exclude: ['solution'],
                include: ['week']
            } // No enviar la solución al cliente
        });

        // Obtener progreso del usuario para estos ejercicios
        const userProgress = await UserProgress.findAll({
            where: {
                UserId: req.user.id,
                ExerciseId: exercises.map(ex => ex.id)
            }
        });

        // Mapear progreso a cada ejercicio
        const exercisesWithProgress = exercises.map(exercise => {
            const progress = userProgress.find(p => p.ExerciseId === exercise.id);
            return {
                ...exercise.toJSON(),
                completed: progress ? progress.completed : false,
                started: !!progress
            };
        });

        res.status(200).json({
            success: true,
            data: {
                category,
                exercises: exercisesWithProgress
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
};

// @desc    Obtener un ejercicio específico
// @route   GET /api/exercises/:id
// @access  Private
exports.getExercise = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar ejercicio
        const exercise = await Exercise.findByPk(req.params.id, {
            include: [{
                model: Category,
                as: 'category'
            }]
        });

        if (!exercise) {
            return res.status(404).json({ success: false, error: 'Ejercicio no encontrado' });
        }

        // Obtener progreso del usuario para este ejercicio
        const progress = await UserProgress.findOne({
            where: {
                UserId: req.user.id,
                ExerciseId: exercise.id
            }
        });

        const exerciseData = {
            ...exercise.toJSON(),
            userProgress: progress || null
        };

        res.status(200).json({ success: true, data: exerciseData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
};

// Constantes para las insignias
const BADGES = {
    SPEED_SOLVER: 'speed-solver',         // Resolver en menos de 3 minutos
    QUICK_THINKER: 'quick-thinker',       // Resolver en menos de 5 minutos
    CONSISTENT: 'consistent',             // 5 ejercicios seguidos
    MASTER_BEGINNER: 'master-beginner',   // Primer ejercicio fácil
    MASTER_MEDIUM: 'master-medium',       // Primer ejercicio medio
    MASTER_HARD: 'master-hard',           // Primer ejercicio difícil
    STREAK_3: 'streak-3',                 // 3 días seguidos
    STREAK_7: 'streak-7',                 // 7 días seguidos
    STREAK_30: 'streak-30',               // 30 días seguidos
    XP_100: 'xp-100',                    // 100 XP acumulados
    XP_500: 'xp-500',                    // 500 XP acumulados
    XP_1000: 'xp-1000'                   // 1000 XP acumulados
};

// @desc    Verificar solución de ejercicio
// @route   POST /api/exercises/:id/verify
// @access  Private
exports.verifyExercise = async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { code, timeTaken, timeDetails } = req.body;

        // Obtener el ejercicio
        const exercise = await Exercise.findByPk(id, {
            transaction
        });

        // Preparar casos de prueba
        const testCases = {
            input: exercise.testInput || '',
            expectedOutput: exercise.solution
        };

        // Verificar el código usando Judge0
        const codeResult = await Judge0Service.submitCode(code, testCases);

        // La verificación ahora será más precisa
        const isCorrect = codeResult.success && validateSolution(codeResult.output, exercise.solution);

        // Actualizar o crear progreso
        let userProgress = await UserProgress.findOne({
            where: {
                UserId: req.user.id,
                ExerciseId: exercise.id
            },
            transaction
        });

        if (userProgress) {
            userProgress.code = code;
            userProgress.score = isCorrect ? exercise.xpReward : 0;
            userProgress.completed = isCorrect;
            userProgress.timeTaken = parseInt(timeTaken) || 0; // Agregar tiempo
            userProgress.timeDetails = typeof timeDetails === 'object' ?
                JSON.stringify(timeDetails) :
                timeDetails; // Manejar el formato correcto // Agregar detalles de tiempo
            if (isCorrect && !userProgress.completedAt) {
                userProgress.completedAt = new Date();
            }
            await userProgress.save({ transaction });
        } else {
            userProgress = await UserProgress.create({
                UserId: req.user.id,
                ExerciseId: exercise.id,
                code,
                score: isCorrect ? exercise.xpReward : 0,
                completed: isCorrect,
                completedAt: isCorrect ? new Date() : null,
                timeTaken: parseInt(timeTaken) || 0,
                timeDetails: typeof timeDetails === 'object' ?
                    JSON.stringify(timeDetails) :
                    timeDetails // Manejar el formato correcto
            }, { transaction });
        }

        if (isCorrect) {
            const user = await User.findByPk(req.user.id, {
                lock: true,
                transaction
            });

            // Update user stats
            user.xp += exercise.xpReward;
            user.level = Math.floor(user.xp / 200) + 1;
            user.lastActive = new Date();

            // Update streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const recentActivity = await UserProgress.findOne({
                where: {
                    UserId: user.id,
                    completed: true,
                    completedAt: {
                        [Op.gte]: yesterday
                    }
                },
                order: [['completedAt', 'DESC']],
                transaction
            });

            user.streak = recentActivity ? user.streak + 1 : 1;
            await user.save({ transaction });

            // Process all badges in parallel
            const earnedBadges = [];

            // Speed badges
            if (timeTaken < 180) { // 3 minutes
                const badge = await checkAndAwardBadge(user.id, 'speed-solver', transaction);
                if (badge) earnedBadges.push(badge);
            } else if (timeTaken < 300) { // 5 minutes
                const badge = await checkAndAwardBadge(user.id, 'quick-thinker', transaction);
                if (badge) earnedBadges.push(badge);
            }

            // Difficulty badge
            const difficultyBadgeCode = {
                'Fácil': 'master-beginner',
                'Medio': 'master-medium',
                'Difícil': 'master-hard'
            }[exercise.difficulty];

            if (difficultyBadgeCode) {
                const badge = await checkAndAwardBadge(user.id, difficultyBadgeCode, transaction);
                if (badge) earnedBadges.push(badge);
            }

            // Streak badges
            const streakThresholds = [
                [30, 'streak-30'],
                [7, 'streak-7'],
                [3, 'streak-3']
            ];

            for (const [threshold, code] of streakThresholds) {
                if (user.streak >= threshold) {
                    const badge = await checkAndAwardBadge(user.id, code, transaction);
                    if (badge) earnedBadges.push(badge);
                }
            }

            // XP badges
            const xpThresholds = [
                [1000, 'xp-1000'],
                [500, 'xp-500'],
                [100, 'xp-100']
            ];

            for (const [threshold, code] of xpThresholds) {
                if (user.xp >= threshold) {
                    const badge = await checkAndAwardBadge(user.id, code, transaction);
                    if (badge) earnedBadges.push(badge);
                }
            }

            // Consistency badge
            const completedCount = await UserProgress.count({
                where: {
                    UserId: user.id,
                    completed: true
                },
                transaction
            });

            if (completedCount >= 5) {
                const badge = await checkAndAwardBadge(user.id, 'consistent', transaction);
                if (badge) earnedBadges.push(badge);
            }

            await transaction.commit();

            res.status(200).json({
                success: true,
                data: {
                    correct: true,
                    xpEarned: exercise.xpReward,
                    newLevel: user.level,
                    streak: user.streak,
                    earnedBadges,
                    timeTaken,
                    timeDetails
                }
            });
        } else {
            await transaction.commit();
            res.status(200).json({
                success: true,
                data: {
                    correct: false,
                    message: 'Solución incorrecta',
                    output: codeResult.output,
                    error: codeResult.error
                }
            });
        }

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor',
            message: error.message
        });
    }
};

function validateSolution(output, solution) {
    try {
        // Si el output es string, intenta parsear (por si es un array en formato string)
        let parsedOutput;
        if (typeof output === 'string') {
            try {
                parsedOutput = JSON.parse(output.trim());
            } catch (e) {
                // Si no es JSON válido, lo tratamos como string plano
                parsedOutput = output.trim().toLowerCase();
            }
        } else {
            parsedOutput = output;
        }

        // Normaliza las soluciones válidas: aseguramos array
        let validSolutions = Array.isArray(solution) ? solution : [solution];

        // Si el output parseado es un array, entonces comparamos arrays como strings
        if (Array.isArray(parsedOutput)) {
            const outputStr = parsedOutput.join(',').toLowerCase();
            validSolutions = validSolutions.map(sol =>
                Array.isArray(sol)
                    ? sol.join(',').toLowerCase()
                    : String(sol).trim().toLowerCase()
            );
            const isValid = validSolutions.includes(outputStr);

            console.log('Comparando como array -> string');
            console.log('Salida normalizada:', outputStr);
            console.log('Soluciones normalizadas:', validSolutions);
            return isValid;

        } else {
            // Si es un string plano, comparamos directamente
            const normalizedOutput = String(parsedOutput).trim().toLowerCase();
            validSolutions = validSolutions.map(sol => String(sol).trim().toLowerCase());

            const isValid = validSolutions.includes(normalizedOutput);

            console.log('Comparando como string');
            console.log('Salida normalizada:', normalizedOutput);
            console.log('Soluciones normalizadas:', validSolutions);
            return isValid;
        }

    } catch (error) {
        console.error('Error en validación:', error);
        console.error('Output del Judge:', output);
        console.error('Soluciones válidas:', solution);
        return false;
    }
}


// Helper function to check and award badges
const checkAndAwardBadge = async (userId, badgeCode, transaction) => {
    const badge = await Badge.findOne({
        where: { code: badgeCode },
        transaction
    });

    if (badge) {
        const [userBadge] = await UserBadge.findOrCreate({
            where: { UserId: userId, BadgeId: badge.id },
            transaction
        });
        return userBadge ? badge : null;
    }
    return null;
};


// @desc    Actualizar parcialmente un ejercicio
// @route   PUT /api/exercises/:id
// @access  Private/Admin
exports.updateExercise = async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const updateData = req.body;

        // Buscar ejercicio
        const exercise = await Exercise.findByPk(id, {
            include: [{
                model: Category,
                as: 'category'
            }],
            transaction
        });

        if (!exercise) {
            if (transaction) await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Ejercicio no encontrado'
            });
        }

        // Validar campos permitidos para actualización
        const allowedFields = [
            'title',
            'description',
            'instructions',
            'initialCode',
            'solution',
            'difficulty',
            'xpReward',
            'order',
            'week',
            'CategoryId'
        ];

        const sanitizedData = Object.keys(updateData)
            .filter(key => allowedFields.includes(key))
            .reduce((obj, key) => {
                obj[key] = updateData[key];
                return obj;
            }, {});

        // Actualizar ejercicio
        await exercise.update(sanitizedData, { transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            data: exercise
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error actualizando ejercicio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el ejercicio',
            message: error.message
        });
    }
};

// @desc    Eliminar un ejercicio
// @route   DELETE /api/exercises/:id
// @access  Private/Admin
exports.deleteExercise = async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;

        // Buscar ejercicio
        const exercise = await Exercise.findByPk(id, { transaction });

        if (!exercise) {
            if (transaction) await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Ejercicio no encontrado'
            });
        }

        // Verificar si hay progreso de usuarios en este ejercicio
        const hasUserProgress = await UserProgress.findOne({
            where: { ExerciseId: id },
            transaction
        });

        if (hasUserProgress) {
            if (transaction) await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar el ejercicio porque hay usuarios que lo han completado'
            });
        }

        // Eliminar ejercicio
        await exercise.destroy({ transaction });

        await transaction.commit();

        res.status(200).json({
            success: true,
            message: 'Ejercicio eliminado correctamente',
            data: {
                id: exercise.id,
                title: exercise.title
            }
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error eliminando ejercicio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el ejercicio',
            message: error.message
        });
    }
};

// @desc    Crear un nuevo ejercicio
// @route   POST /api/exercises
// @access  Private/Admin
exports.createExercise = async (req, res) => {
    let transaction;

    try {
        transaction = await sequelize.transaction();
        const {
            title,
            description,
            instructions,
            initialCode,
            solution,
            difficulty,
            xpReward,
            order,
            week,
            CategoryId
        } = req.body;

        // Validar campos requeridos
        if (!title || !description || !instructions || !solution || !CategoryId) {
            if (transaction) await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Por favor proporcione todos los campos requeridos'
            });
        }

        // Crear ejercicio
        const exercise = await Exercise.create({
            title,
            description,
            instructions,
            initialCode: initialCode || '',
            solution,
            difficulty: difficulty || 'Fácil',
            xpReward: xpReward || 10,
            order: order || 0,
            week: week || 1,
            CategoryId
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            success: true,
            data: exercise
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creando ejercicio:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el ejercicio',
            message: error.message
        });
    }
};

// @desc    Obtener ejercicios por semana
// @route   GET /api/exercises/week/:week
// @access  Private
exports.getExercisesByWeek = async (req, res) => {
    try {
        const { week } = req.params;

        // Validar que week sea un número entre 1 y 3
        const weekNumber = parseInt(week);
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 3) {
            return res.status(400).json({
                success: false,
                error: 'El número de semana debe ser 1, 2 o 3'
            });
        }

        // Primero obtener todos los ejercicios de la semana específica
        const exercises = await Exercise.findAll({
            where: {
                week: weekNumber
            },
            include: [{
                model: Category,
                as: 'category', // Agregamos el alias 'category'
                attributes: ['id', 'name', 'slug', 'order']
            }],
            attributes: {
                exclude: ['solution']
            },
            order: [
                [{ model: Category, as: 'category' }, 'order', 'ASC'],
                ['order', 'ASC']
            ]
        });

        // Obtener progreso del usuario para estos ejercicios
        const userProgress = await UserProgress.findAll({
            where: {
                UserId: req.user.id,
                ExerciseId: exercises.map(ex => ex.id)
            }
        });

        // Agrupar ejercicios por categoría
        const exercisesByCategory = exercises.reduce((acc, exercise) => {
            const categoryId = exercise.category.id;
            if (!acc[categoryId]) {
                acc[categoryId] = {
                    id: exercise.category.id,
                    name: exercise.category.name,
                    slug: exercise.category.slug,
                    order: exercise.category.order,
                    exercises: []
                };
            }

            const progress = userProgress.find(p => p.ExerciseId === exercise.id);
            acc[categoryId].exercises.push({
                ...exercise.toJSON(),
                category: undefined,
                completed: progress ? progress.completed : false,
                started: !!progress
            });

            return acc;
        }, {});

        // Convertir el objeto a array y ordenar por el orden de la categoría
        const categoriesWithProgress = Object.values(exercisesByCategory)
            .sort((a, b) => a.order - b.order);

        res.status(200).json({
            success: true,
            data: {
                week: weekNumber,
                categories: categoriesWithProgress
            }
        });

    } catch (error) {
        console.error('Error al obtener ejercicios por semana:', error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
};

// @desc    Obtener ejercicios por categoría, semana y orden
// @route   GET /api/exercises/category/:slug/week/:week
// @access  Private
exports.getExercisesByWeekAndOrder = async (req, res) => {
    try {
        const { slug, week } = req.params;

        // Validar que week sea un número entre 1 y 3
        const weekNumber = parseInt(week);
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 3) {
            return res.status(400).json({
                success: false,
                error: 'El número de semana debe ser 1, 2 o 3'
            });
        }

        // Buscar categoría
        const category = await Category.findOne({
            where: { slug }
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        // Buscar ejercicios que cumplan con los criterios
        const exercises = await Exercise.findAll({
            where: {
                CategoryId: category.id,
                week: weekNumber,
                order: {
                    [Op.in]: [1, 2, 3] // Solo ejercicios con order 1, 2 o 3
                }
            },
            order: [['order', 'ASC']],
            attributes: {
                exclude: ['solution']
            }
        });

        // Obtener progreso del usuario para estos ejercicios
        const userProgress = await UserProgress.findAll({
            where: {
                UserId: req.user.id,
                ExerciseId: exercises.map(ex => ex.id)
            }
        });

        // Mapear ejercicios con su progreso
        const exercisesWithProgress = exercises.map(exercise => {
            const progress = userProgress.find(p => p.ExerciseId === exercise.id);
            return {
                ...exercise.toJSON(),
                completed: progress ? progress.completed : false,
                started: !!progress
            };
        });

        res.status(200).json({
            success: true,
            data: {
                category: {
                    id: category.id,
                    name: category.name,
                    slug: category.slug
                },
                week: weekNumber,
                exercises: exercisesWithProgress
            }
        });

    } catch (error) {
        console.error('Error al obtener ejercicios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los ejercicios'
        });
    }
};