const express = require('express');
const {
    getCategoriesProgress
} = require('../controllers/categories');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Definir las rutas
router.get('/progress', protect, getCategoriesProgress);

module.exports = router;