"use strict";

module.exports = function(sequelize, DataTypes) {
  var Stream = sequelize.define("Stream", {
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { }
    },
    description: {
      type: DataTypes.TEXT('long'),
      allowNull: true
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
        Stream.belongsTo(models.StreamVisibility, { as: 'Visibiliy', foreignKey: "visibility" });
        Stream.belongsTo(models.User, { as: "User", foreignKey: "created_by" });
        Stream.belongsTo(models.Location, { as: 'Location', foreignKey: "location" });
        Stream.belongsTo(models.GuardianSite, { as: 'Site', foreignKey: "site" });
      },
      indexes: [
        {
          unique: true,
          fields: ["guid"]
        }
      ]
    },
    tableName: "Streams"
  });

  return Stream;
};

