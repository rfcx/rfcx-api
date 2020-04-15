"use strict";

module.exports = function(sequelize, DataTypes) {
  var ClassificationSpeciesNameRelation = sequelize.define("ClassificationSpeciesNameRelation", {}, {
    tableName: "ClassificationSpeciesNameRelations"
  });

  return ClassificationSpeciesNameRelation;
};
