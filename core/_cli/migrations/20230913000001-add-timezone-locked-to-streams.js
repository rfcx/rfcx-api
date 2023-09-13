'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'streams',
      'timezone_locked',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('users', 'timezone_locked')
  }
}
