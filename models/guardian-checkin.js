"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianCheckIn = sequelize.define("GuardianCheckIn", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    queued_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    is_certified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    request_latency_api: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    request_latency_guardian: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    guardian_skipped_checkins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    guardian_queued_checkins: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    timezone_offset_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianCheckIn.belongsTo(models.Guardian, {as: "Guardian"});
        GuardianCheckIn.hasMany(models.GuardianAudio, {as: "Audio", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaCPU, {as: "MetaCPU", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaBattery, {as: "MetaBattery", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaDataTransfer, {as: "MetaDataTransfer", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaLightMeter, {as: "MetaLightMeter", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaGeoLocation, {as: "MetaGeoLocation", foreignKey: "check_in_id"});
        
        GuardianCheckIn.hasMany(models.GuardianMetaNetwork, {as: "MetaNetwork", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaOffline, {as: "MetaOffline", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaPower, {as: "MetaPower", foreignKey: "check_in_id"});
        GuardianCheckIn.hasMany(models.GuardianMetaMessage, {as: "MetaMessages", foreignKey: "check_in_id"});

        GuardianCheckIn.hasMany(models.GuardianEvent, {as: "Event", foreignKey: "check_in_id"});

      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return GuardianCheckIn;
};
