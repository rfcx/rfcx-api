'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('DROP TABLE IF EXISTS FilterPresets;')
  },

  down: function () {
    return true // no way back!
  }
}
