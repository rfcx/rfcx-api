'use strict'
module.exports = function (sequelize, DataTypes) {
  var GuardianMetaSegmentsGroup = sequelize.define('GuardianMetaSegmentsGroup', {

    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
      }
    },

    segment_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
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

    checksum: {
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
