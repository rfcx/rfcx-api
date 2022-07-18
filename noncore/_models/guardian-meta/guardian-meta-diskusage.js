'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaDiskUsage = sequelize.define('GuardianMetaDiskUsage', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaDiskUsage should have type Date' }
      }
    },
    internal_bytes_available: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    internal_bytes_used: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    external_bytes_available: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    external_bytes_used: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaDiskUsage'
  })
  GuardianMetaDiskUsage.associate = function (models) {
    GuardianMetaDiskUsage.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaDiskUsage
}
