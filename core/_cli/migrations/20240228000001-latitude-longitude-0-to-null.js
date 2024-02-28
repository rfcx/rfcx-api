'use strict'
const updatedStreamIds = []
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      const [streams] = await queryInterface.sequelize.query('select id from streams where latitude = 0 and longitude = 0', { transaction })
      for (const stream of streams) {
        await queryInterface.sequelize.query(`update streams set latitude = null, longitude = null where id = ${stream.id}`, { transaction })
        updatedStreamIds.push(stream.id)
      }
    })
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.transaction(async transaction => {
      for (const stream of updatedStreamIds) {
        await queryInterface.sequelize.query(`update streams set latitude = 0, longitude = 0 where id = ${stream.id}`, { transaction })
      }
    })
  }
}
