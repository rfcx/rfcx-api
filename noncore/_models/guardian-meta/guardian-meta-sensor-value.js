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
    },
    sensor_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isFloat: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaSensorValues'
  })

  return GuardianMetaSensorValue
}
