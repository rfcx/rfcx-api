'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianGroupGuardianAudioEventValueRelation = sequelize.define('GuardianGroupGuardianAudioEventValueRelation', {}, {
    tableName: 'GuardianGroupGuardianAudioEventValueRelations'
  })

  return GuardianGroupGuardianAudioEventValueRelation
}
