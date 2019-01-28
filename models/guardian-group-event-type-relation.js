"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianGroupGuardianAudioEventTypeRelation = sequelize.define("GuardianGroupGuardianAudioEventTypeRelation", {}, {
    tableName: "GuardianGroupGuardianAudioEventTypeRelations"
  });

  return GuardianGroupGuardianAudioEventTypeRelation;
};
