"use strict";

module.exports = function(sequelize, DataTypes) {
  var AdoptProtectDonation = sequelize.define("AdoptProtectDonation", {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
      }
    },
    donor_name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    donor_email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    donated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: "donated_at for AdoptProtectDonation should have type Date" }
      }
    },
    donation_amount: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    donation_currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
      allowNull: false,
      unique: false,
      validate: {
      }
    },
    donation_context: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      validate: {
      }
    },
    area_hectares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        isInt: true,
        min: 0
      }
    },
    area_polygon: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: false,
      validate: {
      }
    }
  }, {
    indexes: [
      { unique: true, fields: ["guid"] }
    ],
    tableName: "AdoptProtectDonations"
  });

  return AdoptProtectDonation;
};
