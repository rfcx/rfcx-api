'use strict'
const timeUtil = require('../utils/misc/timezone')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('streams', 'timezone', { type: Sequelize.STRING, allowNull: true }, { transaction: t })
      const locations = await queryInterface.sequelize.query('SELECT id, latitude, longitude FROM public.streams', { type: Sequelize.QueryTypes.SELECT, transaction: t })
      for (const location of locations) {
        const { id, latitude, longitude } = location
        const timezone = latitude != null && longitude != null ? `'${timeUtil.getTzByLatLng(latitude, longitude)}'` : null
        await queryInterface.sequelize.query(`UPDATE public.streams SET timezone=${timezone} WHERE id='${id}';`, { transaction: t })
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'timezone')
  }
}
