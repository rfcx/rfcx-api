'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaBattery = sequelize.define('GuardianMetaBattery', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaBattery should have type Date' }
      }
    },
    battery_percent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    battery_temperature: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    is_charging: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
      validate: {
      }
    },
    is_fully_charged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
      validate: {
      }
    }
  }, {
    tableName: 'GuardianMetaBattery'
  })
  GuardianMetaBattery.associate = function (models) {
    GuardianMetaBattery.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaBattery
}
