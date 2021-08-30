'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Guardians',
      'stream_id',
      {
        type: Sequelize.STRING(12),
        allowNull: true
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'stream_id')
  }
}
