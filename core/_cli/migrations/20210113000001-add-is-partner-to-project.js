'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'projects',
      'is_partner',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('projects', 'is_partner')
  }
}
