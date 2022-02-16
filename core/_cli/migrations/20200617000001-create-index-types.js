'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('index_types', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('index_types')
  }
}
