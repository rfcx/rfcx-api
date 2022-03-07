'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('streams', 'altitude', { type: Sequelize.REAL, allowNull: true })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'altitude')
  }
}
