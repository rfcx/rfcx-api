'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'users',
      'is_super',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('users', 'is_super')
  }
}
