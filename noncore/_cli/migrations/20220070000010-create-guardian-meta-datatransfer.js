'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaDataTransfer', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        started_at: {
          type: Sequelize.DATE(3)
        },
        ended_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        mobile_bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        mobile_bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        mobile_total_bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        mobile_total_bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        network_bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        network_bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        network_total_bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        network_total_bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        total_bytes_received: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        total_bytes_sent: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        check_in_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaDataTransfer\"', 'ended_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaDataTransfer', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaDataTransfer')
  }
}
