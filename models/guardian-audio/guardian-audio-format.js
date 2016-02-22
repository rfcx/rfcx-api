"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioFormat = sequelize.define("GuardianAudioFormat", {
    container: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    codec: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
      ]
    },
    tableName: "GuardianAudioFormats"
  });

  return GuardianAudioFormat;
};
