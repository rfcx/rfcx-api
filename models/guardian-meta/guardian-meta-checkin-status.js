'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaCheckInStatus = sequelize.define('GuardianMetaCheckInStatus', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: { msg: 'measured_at for GuardianMetaCheckInStatus should have type Date' }
      }
    },
    queued_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    queued_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    skipped_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    skipped_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    stashed_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    stashed_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    sent_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    sent_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    archived_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    archived_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    meta_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    meta_size_bytes: {
      type: DataTypes.BIGINT,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    }
  }, {
    tableName: 'GuardianMetaCheckInStatus'
  })

  return GuardianMetaCheckInStatus
}
