'use strict'
const { getTzByLatLng } = require('../../_utils/datetime/timezone')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('streams', 'timezone', { type: Sequelize.STRING(40), allowNull: true }, { transaction: t })
      const locations = await queryInterface.sequelize.query('SELECT id, latitude, longitude FROM streams', { type: Sequelize.QueryTypes.SELECT, transaction: t })
      for (const location of locations) {
        const { id, latitude, longitude } = location
        const timezone = latitude != null && longitude != null ? `'${await getTzByLatLng(latitude, longitude)}'` : null
        await queryInterface.sequelize.query(`UPDATE streams SET timezone=${timezone} WHERE id='${id}';`, { transaction: t })
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'timezone')
  }
}
