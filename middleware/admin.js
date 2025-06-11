exports.adminOnly = async (req, res, next) => {
    if (!req.user || !req.user.isAdmin()) {
        return res.status(403).json({
            success: false,
            error: 'Acceso restringido solo para administradores'
        });
    }
    next();
};