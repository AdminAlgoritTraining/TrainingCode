'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('users', 'role', {
            type: Sequelize.ENUM('user', 'admin'),
            defaultValue: 'user',
            allowNull: false
        });
        await queryInterface.sequelize.sync({ alter: true });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('users', 'role');
        await queryInterface.sequelize.query('DROP TYPE enum_users_role;');
    }
};