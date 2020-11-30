'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Users',
      'is_super',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Users', 'is_super')
  }
}
