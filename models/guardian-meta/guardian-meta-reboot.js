'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaReboot = sequelize.define('GuardianMetaReboot', {
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

  return GuardianMetaReboot
}
