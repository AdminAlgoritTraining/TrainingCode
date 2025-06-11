const validateExerciseInput = (req, res, next) => {
    const { code } = req.body;
    if (!code || typeof code !== 'string') {
        return res.status(400).json({
            success: false,
            error: 'El código es requerido y debe ser una cadena de texto'
        });
    }
    next();
};

module.exports = { validateExerciseInput };