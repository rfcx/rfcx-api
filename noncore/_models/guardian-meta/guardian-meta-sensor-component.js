'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSensorComponent = sequelize.define('GuardianMetaSensorComponent', {
    shortname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaSensorComponents'
  })
  return GuardianMetaSensorComponent
}
