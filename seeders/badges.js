const { Badge } = require('../models');

const badges = [
    {
        name: 'Velocista',
        code: 'speed-solver',
        description: 'Resolvió un ejercicio en menos de 3 minutos',
        icon: '⚡'
    },
    {
        name: 'Pensador Rápido',
        code: 'quick-thinker',
        description: 'Resolvió un ejercicio en menos de 5 minutos',
        icon: '🤔'
    },
    {
        name: 'Consistente',
        code: 'consistent',
        description: 'Completó 5 ejercicios seguidos',
        icon: '📈'
    },
    {
        name: 'Maestro Principiante',
        code: 'master-beginner',
        description: 'Completó su primer ejercicio fácil',
        icon: '🌱'
    },
];

const seedBadges = async () => {
    try {
        await Badge.bulkCreate(badges);
        console.log('Insignias creadas exitosamente');
    } catch (error) {
        console.error('Error al crear las insignias:', error);
    }
};

module.exports = seedBadges;