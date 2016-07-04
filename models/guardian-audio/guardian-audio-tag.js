"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioTag = sequelize.define("GuardianAudioTag", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    begins_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    ends_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    begins_at_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    ends_at_offset: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
      allowNull: false,
      validate: {
        isFloat: true,
        min: 0.0,
        max: 1.0
      }
    }
  }, {
    classMethods: {
      associate: function(models) {

        GuardianAudioTag.belongsTo(models.User, { as: "User", foreignKey: "tagged_by_user" });
        GuardianAudioTag.belongsTo(models.AudioAnalysisModel, { as: "Model", foreignKey: "tagged_by_model" });
        GuardianAudioTag.belongsTo(models.GuardianAudio, { as: "Audio", foreignKey: "audio_id" });

      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianAudioTags"
  });

  return GuardianAudioTag;
};
