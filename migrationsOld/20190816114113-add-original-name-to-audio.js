'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'GuardianAudio',
      'original_filename',
      {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {}
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('GuardianAudio', 'original_filename')
  }

}
