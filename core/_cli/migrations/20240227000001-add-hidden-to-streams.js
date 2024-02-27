'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      // Add hidden
      await queryInterface.addColumn('streams', 'hidden', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      // Remove hidden
      await queryInterface.removeColumn('streams', 'hidden', { transaction })
    })
  }
}
