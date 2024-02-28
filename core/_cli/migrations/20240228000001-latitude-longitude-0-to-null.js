'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`update streams set latitude = null, longitude = null where latitude = 0 and longitude = 0;`)
  },
  down: (queryInterface) => {
    return queryInterface.sequelize.query(`update streams set latitude = 0, longitude = 0 where latitude is null and longitude is null;`)
  }
}
