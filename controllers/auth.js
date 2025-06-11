const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Group } = require('../models');
const { sendPasswordResetEmail } = require('../services/emailService');

// @desc    Registrar un usuario
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    try {
        const { username, name, email, password, role } = req.body;

        // Verificar si el usuario ya existe
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ success: false, error: 'El email ya está registrado' });
        }

        // Crear usuario
        const user = await User.create({
            username,
            name,
            email,
            password,
            role
        });

        sendTokenResponse(user, 201, res);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            error: 'Error en el servidor',
            message: error.message
        });
    }
};

// @desc    Login de usuario
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar que se proporcionen email y password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Por favor proporcione email y contraseña'
            });
        }

        // Buscar usuario por email
        const user = await User.findOne({
            where: { email },
            include: [{
                model: Group,
                as: 'studentGroups',
                attributes: ['id', 'name', 'code'],
                through: { attributes: [] }
            }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Verificar password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Credenciales inválidas'
            });
        }

        // Generar JWT
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const userData = user.toJSON();
        if (user.role === 'student') {
            userData.group = userData.studentGroups?.[0] || null;
            delete userData.studentGroups;
        }

        // Enviar respuesta con rol incluido
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                isAdmin: user.role === 'admin',
                group: userData.group,
                token
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({
            success: false,
            error: 'Error al iniciar sesión'
        });
    }
};

// @desc    Obtener usuario actual
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
            include: [{
                model: Group,
                as: 'studentGroups',
                attributes: ['id', 'name', 'code'],
                through: { attributes: [] } // Excluye los atributos de la tabla intermedia
            }]
        });

        if (!user) {
            return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
        }

        // Si es estudiante, simplificamos la información del grupo
        const userData = user.toJSON();
        if (user.role === 'student') {
            userData.group = userData.studentGroups?.[0] || null;
            delete userData.studentGroups;
        }

        res.status(200).json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Error en el servidor' });
    }
};

// @desc    Refrescar token
// @route   POST /api/auth/refresh-token
// @access  Private
exports.refreshToken = async (req, res) => {
    try {
        // El usuario ya está verificado por el middleware protect
        const user = await User.findByPk(req.user.id, {
            include: req.user.role === 'student' ? [{
                model: Group,
                as: 'studentGroups',
                attributes: ['id', 'name', 'code'],
                through: { attributes: [] }
            }] : []
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido o usuario no encontrado'
            });
        }

        // Generar nuevo token
        const newToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Preparar datos del usuario
        const userData = user.toJSON();
        if (user.role === 'student') {
            userData.group = userData.studentGroups?.[0] || null;
            delete userData.studentGroups;
        }

        res.status(200).json({
            success: true,
            data: {
                token: newToken,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    isAdmin: user.role === 'admin',
                    group: userData.group
                }
            }
        });

    } catch (error) {
        console.error('Error en refresh token:', error);
        res.status(500).json({
            success: false,
            error: 'Error al renovar el token'
        });
    }
};

// Solicitar reset de contraseña
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'No existe un usuario con ese correo'
            });
        }

        // Generar token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Guardar token hasheado y su fecha de expiración
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');

        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        // Enviar email
        await sendPasswordResetEmail(user.email, resetToken);

        res.status(200).json({
            success: true,
            message: 'Email enviado con instrucciones'
        });

    } catch (error) {
        console.error('Error en forgot password:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la solicitud'
        });
    }
};

// Reset de contraseña
exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Obtener usuario con token válido
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const user = await User.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'Token inválido o expirado'
            });
        }

        // Actualizar contraseña
        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('Error en reset password:', error);
        res.status(500).json({
            success: false,
            error: 'Error al resetear la contraseña'
        });
    }
};

// Función para enviar token en respuesta
const sendTokenResponse = (user, statusCode, res) => {
    // Crear token
    const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    // Datos a enviar (incluyendo role e isAdmin)
    const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        level: user.level,
        xp: user.xp,
        streak: user.streak,
        role: user.role,
        isAdmin: user.role === 'admin'
    };

    // Enviar respuesta
    res.status(statusCode).json({
        success: true,
        data: {
            ...userData,
            token
        }
    });
};