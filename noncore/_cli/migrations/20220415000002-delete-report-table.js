'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS ReportAttachmentRelations;', { transaction })
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS Reports;', { transaction })
      await queryInterface.sequelize.query('DROP TABLE IF EXISTS Attachments;', { transaction })
    })
  },

  down: function (queryInterface, Sequelize) {
    return true // no way back!
  }
}
