
const { Group, User } = require('../models');

exports.createGroup = async (req, res) => {
    try {

        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Solo los docentes pueden crear grupos'
            });
        }

        const { code, name, description } = req.body;

        const group = await Group.create({
            name,
            code,
            description,
            teacherId: req.user.id
        });

        res.status(201).json({
            success: true,
            data: group
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear el grupo'
        });
    }
};

exports.getTeacherGroups = async (req, res) => {
    try {
        const groups = await Group.findAll({
            where: {
                teacherId: req.user.id
            },
            include: [{
                model: User,
                as: 'students',
                attributes: ['id', 'username', 'name', 'email']
            }]
        });

        res.status(200).json({
            success: true,
            data: groups
        });
    } catch (error) {
        console.error('Error getting groups:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los grupos'
        });
    }
};


exports.addStudentToGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { studentId } = req.body;

        // Verificar que el grupo existe y pertenece al profesor
        const group = await Group.findOne({
            where: {
                id: groupId,
                teacherId: req.user.id
            }
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado o no tienes permisos sobre él'
            });
        }

        // Verificar que el estudiante existe
        const student = await User.findOne({
            where: {
                id: studentId,
                role: 'student'
            }
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Estudiante no encontrado'
            });
        }

        // Añadir estudiante al grupo
        await group.addStudent(student);

        res.status(200).json({
            success: true,
            message: 'Estudiante añadido al grupo exitosamente'
        });

    } catch (error) {
        console.error('Error adding student to group:', error);
        res.status(500).json({
            success: false,
            error: 'Error al añadir estudiante al grupo'
        });
    }
};

exports.removeStudentFromGroup = async (req, res) => {
    try {
        const { groupId, studentId } = req.params;

        const group = await Group.findOne({
            where: {
                id: groupId,
                teacherId: req.user.id
            }
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado o no tienes permisos sobre él'
            });
        }

        await group.removeStudent(studentId);

        res.status(200).json({
            success: true,
            message: 'Estudiante removido del grupo exitosamente'
        });

    } catch (error) {
        console.error('Error removing student from group:', error);
        res.status(500).json({
            success: false,
            error: 'Error al remover estudiante del grupo'
        });
    }
};

exports.getGroupStudents = async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await Group.findOne({
            where: {
                id: groupId,
                teacherId: req.user.id
            },
            include: [{
                model: User,
                as: 'students',
                attributes: ['id', 'username', 'name', 'email']
            }]
        });

        if (!group) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado o no tienes permisos sobre él'
            });
        }

        res.status(200).json({
            success: true,
            data: group.students
        });

    } catch (error) {
        console.error('Error getting group students:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estudiantes del grupo'
        });
    }
};