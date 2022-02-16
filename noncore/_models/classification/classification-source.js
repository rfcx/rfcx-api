'use strict'

module.exports = function (sequelize, DataTypes) {
  const ClassificationSource = sequelize.define('ClassificationSource', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'ClassificationSources'
  })

  return ClassificationSource
}
