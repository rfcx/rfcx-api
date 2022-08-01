'use strict'

module.exports = function (sequelize, DataTypes) {
  const GuardianMetaInstructionsQueue = sequelize.define('GuardianMetaInstructionsQueue', {
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
      allowNull: true
    },
    command: {
      type: DataTypes.STRING,
      allowNull: true
    },
    meta_json: {
      type: DataTypes.STRING,
      allowNull: true
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
    tableName: 'GuardianMetaInstructionsQueue'
  })
  GuardianMetaInstructionsQueue.associate = function (models) {
    GuardianMetaInstructionsQueue.belongsTo(models.Guardian, { as: 'Guardian', foreignKey: 'guardian_id' })
  }
  return GuardianMetaInstructionsQueue
}
