'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaAccelerometer = sequelize.define('GuardianMetaAccelerometer', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaAccelerometer should have type Date' }
      }
    },
    x: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    y: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    z: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true
      }
    },
    sample_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaAccelerometer'
  })
  GuardianMetaAccelerometer.associate = function (models) {
    GuardianMetaAccelerometer.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }

  return GuardianMetaAccelerometer
}
