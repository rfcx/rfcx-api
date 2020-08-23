'use strict'

module.exports = function (sequelize, DataTypes) {
  var GuardianMetaInstructionsQueue = sequelize.define('GuardianMetaInstructionsQueue', {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    queued_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'queued_at for GuardianMetaInstructionsQueue should have type Date'
        }
      }
    },
    execute_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'execute_at for GuardianMetaInstructionsQueue should have type Date'
        }
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    meta_json: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },
    dispatch_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },
    received_at: {
      type: DataTypes.DATE(3),
      allowNull: true,
      validate: {
        isDate: {
          msg: 'received_at for GuardianMetaInstructionsQueue should have type Date'
        }
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ['guid'] }
    ],
    tableName: 'GuardianMetaInstructionsQueue'
  })

  return GuardianMetaInstructionsQueue
}
