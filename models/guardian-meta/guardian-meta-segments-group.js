'use strict'
module.exports = function (sequelize, DataTypes) {
  const GuardianMetaSegmentsGroup = sequelize.define('GuardianMetaSegmentsGroup', {

    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },

    segment_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: 0
      }
    },

    protocol: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    type: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    },

    checksum_snippet: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
      }
    }

  }, {
    tableName: 'GuardianMetaSegmentsGroups'
  })

  return GuardianMetaSegmentsGroup
}
