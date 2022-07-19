'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaUpdateCheckIn = sequelize.define('GuardianMetaUpdateCheckIn', {}, {
    tableName: 'GuardianMetaUpdateCheckIns'
  })
  GuardianMetaUpdateCheckIn.associate = function (models) {
    GuardianMetaUpdateCheckIn.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
    GuardianMetaUpdateCheckIn.belongsTo(models.GuardianSoftwareVersion, { as: 'Version', foreignKey: 'version_id' })
    GuardianMetaUpdateCheckIn.belongsTo(models.GuardianSoftware, { as: 'Role', foreignKey: 'role_id' })
  }
  return GuardianMetaUpdateCheckIn
}
