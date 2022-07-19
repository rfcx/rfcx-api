'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSentinelAccelerometer = sequelize.define('GuardianMetaSentinelAccelerometer', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaSentinelAccelerometer should have type Date' }
      }
    },
    x_milli_g_force_accel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    y_milli_g_force_accel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    z_milli_g_force_accel: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    sample_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaSentinelAccelerometer'
  })
  GuardianMetaSentinelAccelerometer.associate = function (models) {
    GuardianMetaSentinelAccelerometer.belongsTo(models.GuardianMetaSensorComponent, { as: 'Component', foreignKey: 'component_id' })
  }
  return GuardianMetaSentinelAccelerometer
}
