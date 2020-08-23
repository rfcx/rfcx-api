'use strict'

module.exports = function (sequelize, DataTypes) {
  var StreamVisibility = sequelize.define('StreamVisibility', {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['value'] }
    ],
    tableName: 'StreamVisibilities'
  })

  return StreamVisibility
}
