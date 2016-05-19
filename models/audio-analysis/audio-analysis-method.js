"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisMethod = sequelize.define("AudioAnalysisMethod", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here

      },
      indexes: [
        {
          unique: true,
          fields: ["role"]
        }
      ]
    },
    tableName: "AudioAnalysisMethods"
  });

  return AudioAnalysisMethod;
};
