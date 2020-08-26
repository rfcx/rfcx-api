'use strict'

module.exports = function (sequelize, DataTypes) {
  var UserLocation = sequelize.define('UserLocation', {
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [-90],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [90],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [-180],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [180],
          msg: 'longitude should be equal to or less than 180'
        }
      }
    },
    time: {
      type: DataTypes.DATE(3),
      allowNull: false,
      validate: {
        isDate: { msg: 'time for UserLocations should have type Date' }
      }
    }
  }, {
    tableName: 'UserLocations'
  })

  return UserLocation
}
