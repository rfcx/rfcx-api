"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioFormat = sequelize.define("GuardianAudioFormat", {
    container: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    codec: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    mime: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    file_extension: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    sample_rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
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
