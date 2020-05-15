'use strict';
module.exports = function(sequelize, DataTypes) {
  var GuardianMetaGeoPosition = sequelize.define('GuardianMetaGeoPosition', {
    measured_at: {
      type: DataTypes.DATE(3),
      validate: {
        isDate: {
          msg: "measured_at for GuardianMetaGeoPosition should have type Date"
        }
      }
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -90 ],
          msg: 'latitude should be equal to or greater than -90'
        },
        max: {
          args: [ 90 ],
          msg: 'latitude should be equal to or less than 90'
        }
      }
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [ -180 ],
          msg: 'longitude should be equal to or greater than -180'
        },
        max: {
          args: [ 180 ],
          msg: 'longitude should be equal to or less than 180'
        }
      }
    },
    accuracy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    },
    altitude: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true
      }
    }
  }, {
    tableName: "GuardianMetaGeoPositions"
  });

  return GuardianMetaGeoPosition;
};
