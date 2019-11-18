
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
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'starts should be equal to or greater than 0'
        },
        max: {
          args: [ 4294967295 ],
          msg: 'starts should be equal to or less than 4294967295'
        }
      }
    },
    ends: {
      type: DataTypes.INTEGER.UNSIGNED,
      validate: {
        isInt: true,
        min: {
          args: [ 0 ],
          msg: 'ends should be equal to or greater than 0'
        },
        max: {
          args: [ 4294967295 ],
          msg: 'ends should be equal to or less than 4294967295'
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

