'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.changeColumn('Guardians', 'last_battery_main', { type: Sequelize.FLOAT, allowNull: true, defaultValue: null }, { transaction })
      await queryInterface.addColumn('Guardians', 'last_battery_internal', { type: Sequelize.FLOAT, allowNull: true, defaultValue: null }, { transaction })
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.changeColumn('Guardians', 'last_battery_main', { type: Sequelize.INTEGER, allowNull: true, defaultValue: null }, { transaction })
      await queryInterface.addColumn('Guardians', 'last_battery_internal', { type: Sequelize.INTEGER, allowNull: true, defaultValue: null }, { transaction })
    })
  }
}
