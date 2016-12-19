"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioCollectionsRelations = sequelize.define("GuardianAudioCollectionsRelation", {
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
<<<<<<< HEAD
=======
    },
    position: {
      type: DataTypes.INTEGER
>>>>>>> 09a159874c5bd486551d220e1945f9e62c78a076
    }
  }, {
    tableName: "GuardianAudioCollectionsRelations"
  });

  return GuardianAudioCollectionsRelations;
};
