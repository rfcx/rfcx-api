'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Guardians',
      'is_private',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: true,
        validate: {}
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'is_private')
  }

}
