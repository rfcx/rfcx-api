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
  return GuardianMetaSensor
}
