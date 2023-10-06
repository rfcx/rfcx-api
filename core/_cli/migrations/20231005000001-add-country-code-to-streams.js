'use strict'
const { getCountryCodeByLatLng } = require('../../_utils/location/country-code')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('streams', 'country_code', { type: Sequelize.STRING(3), allowNull: true }, { transaction })
      const locations = await queryInterface.sequelize.query('SELECT id, latitude, longitude FROM streams', { type: Sequelize.QueryTypes.SELECT, transaction })
      for (const location of locations) {
        const { id, latitude, longitude } = location
        const isLatLngExist = latitude != null && longitude != null
        if (isLatLngExist && getCountryCodeByLatLng(latitude, longitude) !== null) {
          await queryInterface.sequelize.query(`UPDATE streams SET country_code=${getCountryCodeByLatLng(latitude, longitude)} WHERE id='${id}';`, { transaction })
        }
      }
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'country_code')
  }
}
