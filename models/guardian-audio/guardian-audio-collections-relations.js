"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioCollectionsRelations = sequelize.define("GuardianAudioCollectionsRelation", {
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    position: {
      type: DataTypes.INTEGER
    }
  }, {
    tableName: "GuardianAudioCollectionsRelations"
  });

  return GuardianAudioCollectionsRelations;
};
