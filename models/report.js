'use strict';

module.exports = function(sequelize, DataTypes) {
  var Report = sequelize.define('Report', {
    guid: {
      type:DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true
    },
    reported_at: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true
      }
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: -90,
        max: 90
      }
    },
    long: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: -180,
        max: 180
      }
    },
    distance: { // 0 is immediate area (nearby), 50 is not far away (but not visible), 100 very far (faintly heard)
      type: DataTypes.INTEGER,
      validate: {
        isInt: true,
        min: 0,
        max: 100
      },
      allowNull: true,
    },
    age_estimate: {
      type: DataTypes.INTEGER,
      validate: {
        isInt: true,
        min: {
          args: 0,
          msg: 'age_estimate should be equal or greater than 0'
        },
        max: {
          args: 30,
          msg: 'age_estimate should be equal or less than 30'
        }
      },
    },
    audio: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: { }
    }
  }, {
    classMethods: {
      associate: function(models) {
        Report.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
        Report.belongsTo(models.User, { foreignKey: 'reporter' });
      }
    }
  });
  return Report;
};
