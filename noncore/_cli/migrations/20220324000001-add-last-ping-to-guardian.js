'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async t => {
      const exists = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_name = 'Guardians' AND column_name = 'last_ping' AND table_schema = 'rfcx_api'
      `, { plain: true, transaction: t })
      if (!exists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE Guardians ADD last_ping datetime(3) NULL AFTER last_check_in
        `, { transaction: t })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'last_ping')
  }
}
