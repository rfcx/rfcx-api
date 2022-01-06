'use strict'

module.exports = function (sequelize, DataTypes) {
  const SourceType = sequelize.define('SourceType', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['name'] }
    ],
    tableName: 'SourceTypes'
  })

  return SourceType
}