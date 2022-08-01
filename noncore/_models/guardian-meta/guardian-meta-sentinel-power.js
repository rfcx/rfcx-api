'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSentinelPower = sequelize.define('GuardianMetaSentinelPower', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaSentinelPower should have type Date' }
      }
    },
    system_temperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    system_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    input_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_state_of_charge: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      validate: {
        isFloat: true,
        min: {
          args: [0],
          msg: 'state of charge should be equal to or greater than 0'
        },
        max: {
          args: [100],
          msg: 'state of charge should be equal to or less than 100'
        }
      }
    },
    battery_voltage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_current: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    battery_power: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: 'GuardianMetaSentinelPower'
  })
  GuardianMetaSentinelPower.associate = function (models) {
    GuardianMetaSentinelPower.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSentinelPower
}
