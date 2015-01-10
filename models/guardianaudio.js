"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudio = sequelize.define("GuardianAudio", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    length: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    analysis_sqs_msg_id: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudio.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
        GuardianAudio.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    },
    tableName: "GuardianAudio"
  });

  return GuardianAudio;
};
