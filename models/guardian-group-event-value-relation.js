'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianGroupGuardianAudioEventValueRelation = sequelize.define('GuardianGroupGuardianAudioEventValueRelation', {}, {
    tableName: 'GuardianGroupGuardianAudioEventValueRelations'
  })

  return GuardianGroupGuardianAudioEventValueRelation
}
