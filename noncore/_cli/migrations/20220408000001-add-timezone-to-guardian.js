'use strict'
const { getTzByLatLng } = require('../../../core/_utils/datetime/timezone')

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      const exists = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.COLUMNS
        WHERE table_name = 'Guardians' AND column_name = 'timezone' AND table_schema = 'rfcx_api'
      `, { plain: true, transaction })
      if (!exists) {
        await queryInterface.sequelize.query(`
        ALTER TABLE Guardians ADD timezone varchar(255) NULL AFTER project_id
        `, { transaction })
        const guardians = await queryInterface.sequelize.query('SELECT id, stream_id, latitude, longitude FROM Guardians', { transaction })
        for (const guardian of guardians[0]) {
          if (guardian.latitude === undefined || guardian.longitude === undefined) {
            console.log(`Guardian "${guardian.id}" coordinates are invalid`, guardian.latitude, guardian.longitude)
            continue
          }
          const timezone = getTzByLatLng(guardian.latitude, guardian.longitude)
          await queryInterface.sequelize.query(`UPDATE Guardians SET timezone="${timezone}" WHERE id=${guardian.id}`, { transaction })
        }
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Guardians', 'timezone')
  }
}
