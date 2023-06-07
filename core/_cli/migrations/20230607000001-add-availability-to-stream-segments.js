'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('stream_segments', 'availability', {
        type: Sequelize.SMALLINT,
        defaultValue: 0,
        allowNull: false
      }, { transaction })
      await queryInterface.sequelize.query('ALTER TABLE stream_segments ALTER COLUMN availability SET DEFAULT 1', { transaction })
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('stream_segments', 'availability')
  }
}
