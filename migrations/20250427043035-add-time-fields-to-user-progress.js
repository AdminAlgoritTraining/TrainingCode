'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('UserProgresses', 'timeTaken', {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.addColumn('UserProgresses', 'timeDetails', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('UserProgresses', 'timeTaken');
    await queryInterface.removeColumn('UserProgresses', 'timeDetails');
  }
};