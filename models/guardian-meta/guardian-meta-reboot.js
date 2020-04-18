'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaReboot = sequelize.define('GuardianMetaReboot', {
    completed_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: "completed_at for GuardianMetaReboot should have type Date"
        }
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