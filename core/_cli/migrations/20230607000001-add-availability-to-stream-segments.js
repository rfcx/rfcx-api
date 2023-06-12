'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn('stream_segments', 'availability', {
      type: Sequelize.SMALLINT,
      defaultValue: 1,
      allowNull: false
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('stream_segments', 'availability')
  }
}
