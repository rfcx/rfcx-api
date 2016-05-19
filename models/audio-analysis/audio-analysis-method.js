"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisMethod = sequelize.define("AudioAnalysisMethod", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    code_download_url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    code_sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    start_command: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here

        AudioAnalysisMethod.belongsTo(models.AudioAnalysisModel, {as: "CurrentModel", foreignKey: "current_model_id"});

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
