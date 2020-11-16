'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('permissions', {
      id: {
        type: Sequelize.STRING(1),
        allowNull: false,
        primaryKey: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('permissions')
  }
}
