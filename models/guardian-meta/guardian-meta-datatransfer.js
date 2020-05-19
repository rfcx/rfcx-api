'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaDataTransfer = sequelize.define('GuardianMetaDataTransfer', {
    started_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: "started_at for GuardianMetaDataTransfer should have type Date" }
      }
    },
    ended_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: "ended_at for GuardianMetaDataTransfer should have type Date" }
      }
    },
    bytes_received: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    bytes_sent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    total_bytes_received: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    total_bytes_sent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: "GuardianMetaDataTransfer"
  });

  return GuardianMetaDataTransfer;
};
