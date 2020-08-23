'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeIndex('Streams', 'name')
    ])
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.query('CREATE UNIQUE INDEX name ON Streams(name);', {
      type: queryInterface.sequelize.QueryTypes.RAW
    })
  }
}
