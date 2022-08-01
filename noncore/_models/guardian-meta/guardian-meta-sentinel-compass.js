'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSentinelCompass = sequelize.define('GuardianMetaSentinelCompass', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaSentinelCompass should have type Date' }
      }
    },
    x_mag_field: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    y_mag_field: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    z_mag_field: {
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
    tableName: 'GuardianMetaSentinelCompass'
  })
  GuardianMetaSentinelCompass.associate = function (models) {
    GuardianMetaSentinelCompass.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSentinelCompass
}
