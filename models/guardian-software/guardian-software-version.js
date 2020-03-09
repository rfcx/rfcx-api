"use strict";

module.exports = function(sequelize, DataTypes) {
  var GuardianSoftwareVersion = sequelize.define("GuardianSoftwareVersion", {
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },
    release_date: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true
      }
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      validate: {
      }
    },
    sha1_checksum: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianSoftwareVersion.belongsTo(models.GuardianSoftware, { as: 'SoftwareRole', foreignKey: "software_role_id" });
      }
    },
    tableName: "GuardianSoftwareVersions"
  });

  return GuardianSoftwareVersion;
};
