
"use strict";

module.exports = function(sequelize, DataTypes) {
  var MasterSegment = sequelize.define("MasterSegment", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      validate: { }
    },
    duration: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'duration should be equal to or greater than 1'
        },
      }
    },
    sample_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'sample_count should be equal to or greater than 1'
        },
      }
    },
    channels_count: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'channels_count should be equal to or greater than 1'
        },
      }
    },
    bit_rate: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 1 ],
          msg: 'bit_rate should be equal to or greater than 1'
        },
      }
    },
  }, {
    classMethods: {
      associate: function(models) {
        MasterSegment.belongsTo(models.Codec, { as: 'Codec', foreignKey: "codec" });
        MasterSegment.belongsTo(models.Format, { as: 'Format', foreignKey: "format" });
        MasterSegment.belongsTo(models.SampleRate, { as: 'SampleRate', foreignKey: "sample_rate" });
        MasterSegment.belongsTo(models.ChannelLayout, { as: 'ChannelLayout', foreignKey: "channel_layout" });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "MasterSegments"
  });

  return MasterSegment;
};

