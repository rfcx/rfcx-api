'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Tables');
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Tables', {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      }
    });
  }
};
