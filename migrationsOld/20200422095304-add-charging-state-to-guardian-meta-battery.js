'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.addColumn(
        'GuardianMetaBattery',
        'is_charging',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        }
      ),
      queryInterface.addColumn(
        'GuardianMetaBattery',
        'is_fully_charged',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('GuardianMetaBattery', 'is_charging'),
      queryInterface.removeColumn('GuardianMetaBattery', 'is_fully_charged')
    ])
  }
}
