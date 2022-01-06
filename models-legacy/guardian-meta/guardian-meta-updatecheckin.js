'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaUpdateCheckIn = sequelize.define('GuardianMetaUpdateCheckIn', {

  }, {
    tableName: 'GuardianMetaUpdateCheckIns'
  })

  return GuardianMetaUpdateCheckIn
}
