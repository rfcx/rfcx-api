'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaOffline', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        ended_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        offline_duration: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        carrier_name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        check_in_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianCheckIns'
            },
            key: 'id'
          }
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaOffline\"', 'ended_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaOffline', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaOffline')
  }
}
