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
  GuardianMetaSensorComponent.associate = function (models) {
    GuardianMetaSensorComponent.hasMany(models.GuardianMetaSensor, { as: 'Sensor', foreignKey: 'component_id' })
  }
  return GuardianMetaSensorComponent
}
