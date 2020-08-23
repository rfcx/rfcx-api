'use strict'

module.exports = function (sequelize, DataTypes) {
  var Codec = sequelize.define('Codec', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'Codecs'
  })

  return Codec
}
