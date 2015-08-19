"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSoftware = sequelize.define("GuardianSoftware", {
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["installer", "updater", "cycle", "system", "audio", "connect", "api", "carrier", "hardware", "guardian", "spectrogram" ]], 
      }
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    release_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianSoftware.belongsTo(models.GuardianSoftwareVersion, {as: "CurrentVersion", foreignKey: "current_version_id"});
      }
    },
    tableName: "GuardianSoftware"
  });

  return GuardianSoftware;
};
