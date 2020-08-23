'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'GuardianAudio',
      'measured_at_local',
      {
        type: Sequelize.DATE(3),
        allowNull: true,
        validate: {
          isDate: true
        }
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('GuardianAudio', 'measured_at_local')
  }
}
