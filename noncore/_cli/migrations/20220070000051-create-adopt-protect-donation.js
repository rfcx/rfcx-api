'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('AdoptProtectDonations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        guid: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        donor_name: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        donor_email: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        donated_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        donation_amount: {
          type: Sequelize.FLOAT,
          defaultValue: 0
        },
        donation_currency: {
          type: Sequelize.STRING,
          defaultValue: 'USD',
          allowNull: false,
          unique: false
        },
        donation_context: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        area_hectares: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        area_polygon: {
          type: Sequelize.TEXT,
          allowNull: true,
          unique: false
        },
        area_site_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianSites'
            },
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      })
      await queryInterface.addIndex('AdoptProtectDonations', ['guid'], { transaction })
      await queryInterface.addIndex('AdoptProtectDonations', ['area_site_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('AdoptProtectDonations')
  }
}
