'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSensor = sequelize.define('GuardianMetaSensor', {
    component_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payload_position: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'GuardianMetaSensors'
  })
  GuardianMetaSensor.associate = function (models) {
    GuardianMetaSensor.belongsTo(models.GuardianMetaSensorComponent, { as: 'Component', foreignKey: 'component_id' })
  }
  return GuardianMetaSensor
}
