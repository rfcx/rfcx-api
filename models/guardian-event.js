"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianEvent = sequelize.define("GuardianEvent", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true
    },
    classification: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    measured_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
          isInt: true,
          min: 1
      }
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianEvent.belongsTo(models.Guardian, {as: 'Guardian'});
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "GuardianEvents"
  });

  return GuardianEvent;
};
