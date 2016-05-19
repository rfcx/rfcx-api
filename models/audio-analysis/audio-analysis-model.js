"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisModel = sequelize.define("AudioAnalysisModel", {
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
    tableName: "AudioAnalysisModels"
  });

  return AudioAnalysisModel;
};
