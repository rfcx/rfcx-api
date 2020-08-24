'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('AudioAnalysisStates', {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
        }
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: false,
        validate: {
        }
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('AudioAnalysisStates')
  }
}
