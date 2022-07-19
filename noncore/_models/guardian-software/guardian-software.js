'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianSoftware = sequelize.define('GuardianSoftware', {
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_updatable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_extra: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'GuardianSoftware'
  })
  GuardianSoftware.associate = function (models) {
    GuardianSoftware.belongsTo(models.GuardianSoftwareVersion, { as: 'CurrentVersion', foreignKey: 'current_version_id', constraints: false })
  }
  return GuardianSoftware
}
