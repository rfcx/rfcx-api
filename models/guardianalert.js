"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAlert = sequelize.define("GuardianAlert", {
    service_key: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    incident_key: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianAlert.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianAlert.belongsTo(models.GuardianAudio, {as: 'GuardianAudio'});
      }
    },
    tableName: "GuardianAlerts"
  });

  return GuardianAlert;
};
