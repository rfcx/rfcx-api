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
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -90 ],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [ 90 ],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -180 ],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [ 180 ],
          msg: 'longitude should be equal to or less than 180'
        }
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
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {}
    },
  }, {
    classMethods: {
      associate: function(models) {
        Guardian.belongsTo(models.GuardianSite, {as: 'Site'});
        Guardian.belongsToMany(models.GuardianGroup, { through: models.GuardianGroupRelation });
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
