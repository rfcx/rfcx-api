"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioEventValue = sequelize.define("GuardianAudioEventValue", {
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    low_level_key: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
    },
    reference_audio: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reference_spectrogram: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  }, {
    tableName: "GuardianAudioEventValues"
  });

  return GuardianAudioEventValue;
};
