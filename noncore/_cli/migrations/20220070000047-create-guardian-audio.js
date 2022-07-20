'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianAudio', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW,
          primaryKey: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        measured_at_local: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        analyzed_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        analysis_queued_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        capture_sample_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        encode_duration: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        sha1_checksum: {
          type: Sequelize.STRING
        },
        url: {
          type: Sequelize.STRING,
          unique: false
        },
        original_filename: {
          type: Sequelize.STRING,
          allowNull: true
        },
        format_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'GuardianAudioFormats'
            },
            key: 'id'
          }
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
        site_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianSites'
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
      })
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianAudio\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianAudio', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianAudio', ['sha1_checksum'], { transaction })
      await queryInterface.addIndex('GuardianAudio', ['guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianAudio')
  }
}
