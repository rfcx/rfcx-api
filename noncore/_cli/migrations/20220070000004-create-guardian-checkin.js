'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianCheckIns', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        measured_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW,
          allowNull: false,
          primaryKey: true
        },
        queued_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW,
          allowNull: true
        },
        request_latency_api: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        request_latency_guardian: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        request_size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        timezone_offset_minutes: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_queued_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_skipped_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        guardian_stashed_checkins: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        is_certified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
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
        site_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
      }, { transaction })
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianCheckIns\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianCheckIns', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianCheckIns')
  }
}
