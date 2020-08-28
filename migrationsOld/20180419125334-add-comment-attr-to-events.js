'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'GuardianAudioEvents',
      'comment',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        defaultValue: null
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('GuardianAudioEvents', 'comment')
  }
}
