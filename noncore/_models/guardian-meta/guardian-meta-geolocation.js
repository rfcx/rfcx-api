'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaGeoLocation = sequelize.define('GuardianMetaGeoLocation', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaGeoLocation should have type Date' }
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    },
    precision: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaGeoLocations'
  })
  GuardianMetaGeoLocation.associate = function (models) {
    GuardianMetaGeoLocation.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaGeoLocation
}
