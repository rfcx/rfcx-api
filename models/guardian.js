"use strict";

module.exports = function(sequelize, DataTypes) {
  var Guardian = sequelize.define("Guardian", {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    shortname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    is_certified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    sim_card_id: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    is_updatable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    },
    cartodb_coverage_id: {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true,
      validate: {
      }
    },
    last_check_in: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    check_in_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    last_update_check_in: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    update_check_in_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    auth_token_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    },
    auth_token_updated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    auth_token_expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    prefs_audio_capture_interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    },
    prefs_service_monitor_interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 1
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        Guardian.belongsTo(models.GuardianSite, {as: 'Site'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    }
  });

  return Guardian;
};
