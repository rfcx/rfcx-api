'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS FilterPresets;', { transaction })
    })
  },

  down: function () {
    return true // no way back!
  }
}
