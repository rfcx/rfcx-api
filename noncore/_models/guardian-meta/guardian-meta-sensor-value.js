'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSensorValue = sequelize.define('GuardianMetaSensorValue', {
    measured_at: {
      type: DataTypes.DATE(3),
      allowNull: false
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    tableName: 'GuardianMetaSensorValues'
  })

  return GuardianMetaSensorValue
}
