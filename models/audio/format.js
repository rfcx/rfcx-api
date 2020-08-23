'use strict'

module.exports = function (sequelize, DataTypes) {
  var Format = sequelize.define('Format', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'Formats'
  })

  return Format
}
