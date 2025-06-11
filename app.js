const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
require('./models');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

// Configuración única de CORS
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? frontendUrl : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());

// Verificar conexión a la base de datos
sequelize.authenticate()
    .then(() => console.log('Database connected'))
    .catch(err => console.error('Database connection error:', err));

// Rutas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/exercises', require('./routes/exercises'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/groups', require('./routes/groups'));

// Ruta base
app.get('/', (req, res) => {
    res.json({ message: 'API de Rutinas de Ejercicios Diarios 2' });
});

// Agrega este middleware después de las rutas
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', frontendUrl);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
    });
});

// Puerto
const PORT = process.env.PORT || 5000;

// Sincronización de base de datos solo en desarrollo
if (process.env.NODE_ENV === 'development') {
    sequelize.sync({ alter: true })
        .then(() => console.log('Database synced'))
        .catch(err => console.error('Sync error:', err));
}

module.exports = app;

// Servidor local solo fuera de producción
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}