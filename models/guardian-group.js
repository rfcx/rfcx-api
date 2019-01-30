"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianGroup = sequelize.define("GuardianGroup", {
    shortname: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isLowercase: {
          args: true,
          msg: 'shortname should be lowercase'
        },
        notContains: {
          args: ' ',
          msg: 'shortname should not contain spaces'
        },
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },

  }, {
    classMethods: {
      associate: function(models) {
        GuardianGroup.belongsTo(models.GuardianSite, { as: 'Site' });
        GuardianGroup.belongsToMany(models.Guardian, { through: models.GuardianGroupRelation });
        GuardianGroup.belongsToMany(models.GuardianAudioEventValue, { through: models.GuardianGroupGuardianAudioEventValueRelation });
        GuardianGroup.belongsToMany(models.GuardianAudioEventType, { through: models.GuardianGroupGuardianAudioEventTypeRelation });
      },
      indexes: [
        {
          unique: true,
          fields: ["shortname"]
        }
      ]
    },
    tableName: "GuardianGroups"
  });

  return GuardianGroup;
};
