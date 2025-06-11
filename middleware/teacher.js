exports.teacherOnly = async (req, res, next) => {
    if (!req.user || req.user.role !== 'teacher') {
        return res.status(403).json({
            success: false,
            error: 'Acceso restringido solo para docentes'
        });
    }
    next();
};