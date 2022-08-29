'use strict'

module.exports = function (sequelize, DataTypes) {
  const Guardian = sequelize.define('Guardian', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    shortname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    is_certified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_visible: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sim_card_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_updatable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      validate: {
        isFloat: true,
        min: {
          args: [-90],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [90],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      validate: {
        isFloat: true,
        min: {
          args: [-180],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [180],
          msg: 'longitude should be equal to or less than 180'
        }
      }
    },
    cartodb_coverage_id: {
      type: DataTypes.UUID,
      unique: false,
      allowNull: true
    },
    last_check_in: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'last_check_in for Guardian should have type Date' }
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
        isDate: { msg: 'last_update_check_in for Guardian should have type Date' }
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
    prefs_audio_capture_interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    prefs_service_monitor_interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    auth_token_salt: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_token_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    auth_token_updated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'auth_token_updated_at for Guardian should have type Date' }
      }
    },
    auth_token_expires_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'auth_token_expires_at for Guardian should have type Date' }
      }
    },
    auth_pin_code: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    notes: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    is_private: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true
    },
    stream_id: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    project_id: {
      type: DataTypes.STRING(12),
      allowNull: true
    },
    creator: {
      type: DataTypes.STRING,
      allowNull: true
    },
    timezone: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    last_deployed: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    last_ping: {
      type: DataTypes.DATE(3),
      allowNull: true
    },
    last_audio_sync: {
      type: DataTypes.DATE(3),
      allowNull: true,
      defaultValue: null,
      validate: {
        isDate: { msg: 'last_audio_sync for Guardian should have type Date' }
      }
    },
    last_battery_main: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null
    },
    last_battery_internal: {
      type: DataTypes.FLOAT,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'Guardians'
  })
  Guardian.associate = function (models) {
    Guardian.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: 'site_id' })
  }
  return Guardian
}
