'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('languages', {
      id: {
        primaryKey: true,
        type: Sequelize.STRING(5),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(32),
        allowNull: false,
        unique: true
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('languages')
  }
}
