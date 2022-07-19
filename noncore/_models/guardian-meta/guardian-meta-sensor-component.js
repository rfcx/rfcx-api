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
    GuardianMetaSensorComponent.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSensorComponent
}
