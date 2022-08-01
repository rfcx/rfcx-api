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
  GuardianMetaSensorValue.associate = function (models) {
    GuardianMetaSensorValue.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
    GuardianMetaSensorValue.belongsTo(models.GuardianMetaSensor, { as: 'Sensor', foreignKey: 'sensor_id' })
  }
  return GuardianMetaSensorValue
}
