'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS Sensations;', { transaction })
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS TimeAxis;', { transaction })
    })
  },

  down: function (queryInterface, Sequelize) {
    return true // no way back!
  }
}
