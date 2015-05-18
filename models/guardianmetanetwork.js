'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaNetwork = sequelize.define('GuardianMetaNetwork', {
    measured_at: {
      type: DataTypes.DATE,
      validate: {
        isDate: true
      }
    },
    signal_strength: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    carrier_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }
  }, {
    classMethods: {
      associate: function(models) {
        GuardianMetaNetwork.belongsTo(models.Guardian, {as: 'Guardian'});
        GuardianMetaNetwork.belongsTo(models.GuardianCheckIn, {as: 'CheckIn'});
      }
    },
    tableName: "GuardianMetaNetwork"
  });
  return GuardianMetaNetwork;
};