'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaReboot = sequelize.define('GuardianMetaReboot', {
    completed_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: true
      }
    },
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaReboot.belongsTo(models.Guardian, {as: "Guardian"});
        GuardianMetaReboot.belongsTo(models.GuardianSite, {as: "Site"});
      }
    },
    tableName: "GuardianMetaReboots"
  });
  return GuardianMetaReboot;
};