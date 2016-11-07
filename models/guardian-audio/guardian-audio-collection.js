"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioCollection = sequelize.define("GuardianAudioCollection", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioCollection.belongsToMany(models.GuardianAudio, { through: 'GuardianAudioCollectionsRelation' });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianAudioCollections"
  });

  return GuardianAudioCollection;
};
