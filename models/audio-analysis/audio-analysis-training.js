"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisTraining = sequelize.define("AudioAnalysisTraining", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "AudioAnalysisTraining"
  });

  return AudioAnalysisTraining;
};
