"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianAudioUpload = sequelize.define("GuardianAudioUpload", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    measured_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {

        GuardianAudioUpload.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianAudioUploads"
  });

  return GuardianAudioUpload;
};
