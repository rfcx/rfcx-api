'use strict'

module.exports = {
  up: function (migration, DataTypes, done) {
    migration.removeColumn('GuardianCheckIns', 'cpu_percent')
    migration.removeColumn('GuardianCheckIns', 'cpu_clock')
    migration.removeColumn('GuardianCheckIns', 'battery_percent')
    migration.removeColumn('GuardianCheckIns', 'battery_temperature')
    migration.removeColumn('GuardianCheckIns', 'network_transmit_time')

    done()
  },

  down: function (migration, DataTypes, done) {
    migration.addColumn(
      'GuardianCheckIns',
      'cpu_percent',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0,
          max: 100
        }
      }
    )

    migration.addColumn(
      'GuardianCheckIns',
      'cpu_clock',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0,
          max: 800
        }
      }
    )

    migration.addColumn(
      'GuardianCheckIns',
      'battery_percent',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0,
          max: 100
        }
      }
    )

    migration.addColumn(
      'GuardianCheckIns',
      'battery_temperature',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: -20,
          max: 99
        }
      }
    )

    migration.addColumn(
      'GuardianCheckIns',
      'network_transmit_time',
      {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          isInt: true,
          min: 0
        }
      }
    )

    done()
  }
}
