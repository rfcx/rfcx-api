'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaHardware', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        phone_imei: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone_imsi: {
          type: Sequelize.STRING,
          allowNull: true
        },
        android_version: {
          type: Sequelize.STRING,
          allowNull: true
        },
        android_build: {
          type: Sequelize.STRING,
          allowNull: true
        },
        manufacturer: {
          type: Sequelize.STRING,
          allowNull: true
        },
        model: {
          type: Sequelize.STRING,
          allowNull: true
        },
        brand: {
          type: Sequelize.STRING,
          allowNull: true
        },
        product: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone_sim_carrier: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone_sim_serial: {
          type: Sequelize.STRING,
          allowNull: true
        },
        phone_sim_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        iridium_imei: {
          type: Sequelize.STRING,
          allowNull: true
        },
        swarm_serial: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sentinel_version: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sentry_version: {
          type: Sequelize.STRING,
          allowNull: true
        },
        description: {
          type: Sequelize.STRING,
          allowNull: true
        },
        guardian_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Guardians'
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
      }, { transaction })
      await queryInterface.addIndex('GuardianMetaHardware', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaHardware')
  }
}
