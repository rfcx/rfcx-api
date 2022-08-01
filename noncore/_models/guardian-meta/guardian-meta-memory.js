'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaMemory = sequelize.define('GuardianMetaMemory', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaMemory should have type Date' }
      }
    },
    system_bytes_available: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    system_bytes_used: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    system_bytes_minimum: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaMemory'
  })
  GuardianMetaMemory.associate = function (models) {
    GuardianMetaMemory.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaMemory
}
