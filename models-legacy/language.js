'use strict'

module.exports = function (sequelize, DataTypes) {
  const Language = sequelize.define('Language', {
    id: {
      primaryKey: true,
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    timestamps: false,
    indexes: [
      { unique: true, fields: ['id'] },
      { unique: true, fields: ['value'] }
    ],
    tableName: 'Languages'
  })

  return Language
}
