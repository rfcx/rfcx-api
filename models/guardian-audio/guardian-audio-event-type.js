"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventType = sequelize.define("GuardianAudioEventType", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
      },
      indexes: [
      ]
    },
    tableName: "GuardianAudioEventTypes"
  });

  return GuardianAudioEventType;
};
