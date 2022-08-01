'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSoftwareVersion = sequelize.define('GuardianMetaSoftwareVersion', {
    last_checkin_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'last_checkin_at for GuardianMetaSoftwareVersion should have type Date'
        }
      }
    }
  }, {
    tableName: 'GuardianMetaSoftwareVersions'
  })
  GuardianMetaSoftwareVersion.associate = function (models) {
    GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftware, { as: 'Role', foreignKey: 'software_id' })
    GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftwareVersion, { as: 'Version', foreignKey: 'version_id' })
    GuardianMetaSoftwareVersion.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaSoftwareVersion
}
