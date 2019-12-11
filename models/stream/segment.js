
"use strict";

module.exports = function(sequelize, DataTypes) {
  var Segment = sequelize.define("Segment", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    starts: {
      type: DataTypes.BIGINT.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'starts should be equal to or greater than 0'
        },
        max: {
          args: [ 32503669200000 ],
          msg: 'starts should be equal to or less than 32503669200000'
        }
      }
    },
    ends: {
      type: DataTypes.BIGINT.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'ends should be equal to or greater than 0'
        },
        max: {
          args: [ 32503669200000 ],
          msg: 'ends should be equal to or less than 32503669200000'
        }
      }
    },
  }, {
    classMethods: {
      associate: function(models) {
        Segment.belongsTo(models.Stream, { as: 'Stream', foreignKey: "stream" });
        Segment.belongsTo(models.MasterSegment, { as: "MasterSegment", foreignKey: "master_segment" });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "Segments"
  });

  return Segment;
};

