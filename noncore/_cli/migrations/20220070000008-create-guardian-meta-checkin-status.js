'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaCheckInStatus', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        queued_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        queued_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        skipped_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        skipped_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        stashed_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        stashed_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        sent_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        sent_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        archived_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        archived_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        meta_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        meta_size_bytes: {
          type: Sequelize.BIGINT,
          allowNull: true
        },
        vault_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        vault_size_bytes: {
          type: Sequelize.BIGINT,
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaCheckInStatus\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaCheckInStatus', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaCheckInStatus')
  }
}
