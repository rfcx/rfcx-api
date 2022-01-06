'use strict'

module.exports = function (sequelize, DataTypes) {
  const ClassificationType = sequelize.define('ClassificationType', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'ClassificationTypes'
  })

  return ClassificationType
}