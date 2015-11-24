"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianEvent = sequelize.define("GuardianEvent", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    classification_analysis: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    classification_reviewer: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    begins_at_analysis: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    begins_at_reviewer: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    duration_analysis: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
          isInt: true,
          min: 1
      }
    },
    duration_reviewer: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
          isInt: true,
          min: 1
      }
    },
    invalidated_analysis: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    invalidated_reviewer: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    fingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianEvent.belongsTo(models.GuardianSite, {as: "Site", foreignKey: "site_id"});
        GuardianEvent.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianEvent.belongsTo(models.GuardianCheckIn, {as: "CheckIn", foreignKey: "check_in_id"});
        GuardianEvent.belongsTo(models.GuardianAudio, {as: "Audio", foreignKey: "audio_id"});
        GuardianEvent.belongsTo(models.User, {as: "Reviewer", foreignKey: "reviewer_id"});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianEvents"
  });

  return GuardianEvent;
};
