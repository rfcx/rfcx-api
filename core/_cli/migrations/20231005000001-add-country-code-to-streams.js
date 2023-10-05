'use strict'
const { getCountryCodeByLatLng } = require('../../_utils/location/country-code')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('streams', 'country_code', { type: Sequelize.STRING(3), allowNull: true }, { transaction: t })
      const locations = await queryInterface.sequelize.query('SELECT id, latitude, longitude FROM streams', { type: Sequelize.QueryTypes.SELECT, transaction: t })
      for (const location of locations) {
        const { id, latitude, longitude } = location
        const countryCode = latitude != null && longitude != null ? `'${getCountryCodeByLatLng(latitude, longitude)}'` : null
        await queryInterface.sequelize.query(`UPDATE streams SET country_code=${countryCode} WHERE id='${id}';`, { transaction: t })
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'country_code')
  }
}
