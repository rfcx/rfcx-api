'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaSoftwareVersion = sequelize.define('GuardianMetaSoftwareVersion', {

    last_checkin_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      allowNull: true,
      validate: {
        isDate: true
      }
    }

  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftware, {as: "Role", foreignKey: "software_id"});
        GuardianMetaSoftwareVersion.belongsTo(models.GuardianSoftwareVersion, {as: "Version", foreignKey: "version_id"});
        GuardianMetaSoftwareVersion.belongsTo(models.Guardian, {as: "Guardian", foreignKey: "guardian_id"});
      }
    },
    tableName: "GuardianMetaSoftwareVersions"
  });
  return GuardianMetaSoftwareVersion;
};