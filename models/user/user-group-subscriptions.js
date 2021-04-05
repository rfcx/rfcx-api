'use strict'

module.exports = function (sequelize, DataTypes) {
  const UserGuardianGroupSubscription = sequelize.define('UserGuardianGroupSubscription', {}, {
    tableName: 'UserGuardianGroupSubscriptions'
  })

  return UserGuardianGroupSubscription
}
