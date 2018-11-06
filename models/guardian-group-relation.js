"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianGroupRelation = sequelize.define("GuardianGroupRelation", {}, {
    tableName: "GuardianGroupRelations"
  });

  return GuardianGroupRelation;
};
