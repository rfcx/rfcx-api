'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS ResetPasswordTokens;', { transaction })
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS UserToken;', { transaction })
    })
  },

  down: function (queryInterface, Sequelize) {
    return true // no way back!
  }
}
