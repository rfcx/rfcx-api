"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisState = sequelize.define("AudioAnalysisState", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: { }
    },
  }, {
    indexes: [
      { unique: true, fields: ["name"] }
    ],
    tableName: "AudioAnalysisStates"
  });

  return AudioAnalysisState;
};
