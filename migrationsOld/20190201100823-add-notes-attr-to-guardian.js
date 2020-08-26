'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Guardians',
      'notes',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        validate: {}
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'notes')
  }
}
