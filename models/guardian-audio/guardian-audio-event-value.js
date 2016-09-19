"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventValue = sequelize.define("GuardianAudioEventValue", {
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
    tableName: "GuardianAudioEventValues"
  });

  return GuardianAudioEventValue;
};
