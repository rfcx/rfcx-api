'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaHardware = sequelize.define('GuardianMetaHardware', {

    phone_imei: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    phone_imsi: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    android_version: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    android_build: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    manufacturer: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    model: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    brand: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    product: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    phone_sim_carrier: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    phone_sim_serial: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    phone_sim_number: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    iridium_imei: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    sentinel_version: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    sentry_version: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    description: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }

  }, {
    tableName: 'GuardianMetaHardware'
  })

  return GuardianMetaHardware
}
