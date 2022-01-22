'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async t => {
      const exists = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_name = 'Guardians' AND column_name = 'last_deployed' AND table_schema = 'rfcx_api'
      `, { plain: true, transaction: t })
      if (!exists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE Guardians ADD last_deployed datetime(3) NULL AFTER stream_id
        `, { transaction: t })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'last_deployed')
  }
}
