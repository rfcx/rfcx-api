'use strict'

module.exports = function (sequelize, DataTypes) {
  const AdoptProtectDonation = sequelize.define('AdoptProtectDonation', {
    guid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    donor_name: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    donor_email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
    },
    donated_at: {
      type: DataTypes.DATE(3),
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: { msg: 'donated_at for AdoptProtectDonation should have type Date' }
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
      unique: false
    },
    donation_context: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false
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
      unique: false
    }
  }, {
    tableName: 'AdoptProtectDonations'
  })
  AdoptProtectDonation.associate = function (models) {
    AdoptProtectDonation.belongsTo(models.GuardianSite, { as: 'AreaSite', foreignKey: 'area_site_id' })
  }
  return AdoptProtectDonation
}
