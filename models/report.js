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
        isDate: { msg: "reported_at for Report should have type Date" }
      }
    },
    lat: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [-90],
          msg: 'lat should be greater or equal to -90'
        },
        max: {
          args: [90],
          msg: 'lat should be equal or less than 90'
        }
      }
    },
    long: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: {
        isFloat: true,
        min: {
          args: [-180],
          msg: 'long should be greater or equal to -180'
        },
        max: {
          args: [180],
          msg: 'long should be equal or less than 180'
        }
      }
    },
    distance: { // 0 is immediate area (nearby), 50 is not far away (but not visible), 100 very far (faintly heard)
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        isInt: true,
        min: {
          args: [0],
          msg: 'distance should be equal or greater than 0'
        },
        max: {
          args: [100],
          msg: 'distance should be equal or less than 100'
        }
      },
    },
    age_estimate: { // 0 = happening now, 10 = in the last 24 hours, 20 = in the last week, 30 = in the last month
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        isInt: true,
        min: {
          args: [0],
          msg: 'age_estimate should be greater or equal to 0'
        },
        max: {
          args: [30],
          msg: 'age_estimate should be equal or less than 30'
        }
      },
    },
    audio: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: { }
    },
    notes: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      defaultValue: null,
      validate: { }
    }
  }, {
    classMethods: {
      associate: function(models) {
        Report.belongsTo(models.GuardianSite, { as: "Site", foreignKey: "site" });
        Report.belongsTo(models.GuardianAudioEventValue, { as: 'Value', foreignKey: "value" });
        Report.belongsTo(models.User, { foreignKey: 'reporter' });
        Report.belongsToMany(models.Attachment, { through: models.ReportAttachmentRelation });
      }
    }
  });
  return Report;
};
