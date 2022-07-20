'use strict'

module.exports = function (sequelize, DataTypes) {
  const ShortLink = sequelize.define('ShortLink', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    access_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'ShortLinks'
  })
  ShortLink.associate = function (models) {}
  return ShortLink
}
