'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaReboot = sequelize.define('GuardianMetaReboot', {
    attempted_at: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: 'completed_at for GuardianMetaReboot should have type Date'
        }
      }
    }
  }, {
    tableName: 'GuardianMetaReboots'
  })
  GuardianMetaReboot.associate = function (models) {
    GuardianMetaReboot.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaReboot
}
