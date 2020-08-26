'use strict'

module.exports = function (sequelize, DataTypes) {
  var FilterPreset = sequelize.define('FilterPreset', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    json: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'FilterPresets'
  })

  return FilterPreset
}
