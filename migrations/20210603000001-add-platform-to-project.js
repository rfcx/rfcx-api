'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn('projects', 'preferred_platform',
      { type: Sequelize.STRING(3), allowNull: true })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('projects', 'preferred_platform')
  }
}
