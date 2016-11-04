"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioCollection = sequelize.define("GuardianAudioCollection", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudioCollection.hasMany(models.GuardianAudio);
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
