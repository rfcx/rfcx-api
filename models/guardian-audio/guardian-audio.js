"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudio = sequelize.define("GuardianAudio", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: "measured_at for GuardianAudio should have type Date" }
      }
    },
    measured_at_local: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: { msg: "measured_at_local for GuardianAudio should have type Date" }
      }
    },
    analyzed_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: "analyzed_at for GuardianAudio should have type Date" }
      }
    },
    analysis_queued_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: "analysis_queued_at for GuardianAudio should have type Date" }
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
    capture_sample_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    encode_duration: {
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
      unique: false,
      validate: {
      }
    },
    original_filename: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAudio.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianAudio.belongsTo(models.GuardianSite, {as: 'Site'});
        GuardianAudio.hasMany(models.GuardianEvent, {as: "Event", foreignKey: "audio_id"});
        GuardianAudio.belongsTo(models.GuardianCheckIn, {as: "CheckIn", foreignKey: "check_in_id"});
        GuardianAudio.belongsTo(models.GuardianAudioFormat, {as: "Format", foreignKey: "format_id"});
        GuardianAudio.belongsToMany(models.GuardianAudioCollection, { through: 'GuardianAudioCollectionsRelation' });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianAudio"
  });

  return GuardianAudio;
};
