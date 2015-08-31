"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSoftware = sequelize.define("GuardianSoftware", {
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    is_updatable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      validate: {
      }
    },
    is_extra: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
        GuardianSoftware.belongsTo(models.GuardianSoftwareVersion, {as: "CurrentVersion", foreignKey: "current_version_id"});
      }
    },
    tableName: "GuardianSoftware"
  });

  return GuardianSoftware;
};
