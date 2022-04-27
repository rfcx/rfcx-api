'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      const exists = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_name = 'Guardians' AND column_name = 'project_id' AND table_schema = 'rfcx_api'
      `, { plain: true, transaction })
      if (!exists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE Guardians ADD project_id varchar(12) NULL AFTER stream_id
        `, { transaction })
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'project_id')
  }
}
