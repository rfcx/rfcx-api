"use strict";

module.exports = function(sequelize, DataTypes) {
  var AudioAnalysisModel = sequelize.define("AudioAnalysisModel", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    shortname: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    method_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    model_download_url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    model_sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    audio_sample_rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: false,
      validate: {
        isInt: true,
        min: 0
      }
    },
    ffmpeg_preprocess_options: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    sox_preprocess_options: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    imagemagick_preprocess_options: {
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
