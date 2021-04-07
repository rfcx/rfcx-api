'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianGroupGuardianAudioEventTypeRelation = sequelize.define('GuardianGroupGuardianAudioEventTypeRelation', {}, {
    tableName: 'GuardianGroupGuardianAudioEventTypeRelations'
  })

  return GuardianGroupGuardianAudioEventTypeRelation
}
