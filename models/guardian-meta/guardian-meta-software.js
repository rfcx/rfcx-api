'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaSoftwareVersion = sequelize.define('GuardianMetaSoftwareVersion', {

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

  return GuardianMetaSoftwareVersion
}
