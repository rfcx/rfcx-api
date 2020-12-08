'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Users',
      'is_super',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Users', 'is_super')
  }
}
