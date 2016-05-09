"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSoftwarePrefs = sequelize.define("GuardianSoftwarePrefs", {

    install_battery_cutoff: {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    install_cycle_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 3600000,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    install_offline_toggle_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 900000,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    cputuner_freq_min: {
      type: DataTypes.INTEGER,
      defaultValue: 30720,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    cputuner_freq_max: {
      type: DataTypes.INTEGER,
      defaultValue: 600000,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    cputuner_governor_up: {
      type: DataTypes.INTEGER,
      defaultValue: 98,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    cputuner_governor_down: {
      type: DataTypes.INTEGER,
      defaultValue: 95,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }

  }, {
    classMethods: {
      associate: function(models) {
        GuardianSoftwarePrefs.belongsTo(models.Guardian, {as: 'Guardian'});
      }
    },
    tableName: "GuardianSoftwarePrefs"
  });

  return GuardianSoftwarePrefs;
};
