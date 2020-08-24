'use strict'

module.exports = function (sequelize, DataTypes) {
  var Location = sequelize.define('Location', {
    guid: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      validate: { }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { }
    },
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
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'Locations'
  })

  return Location
}
