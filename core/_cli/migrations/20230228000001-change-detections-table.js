'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    const type = queryInterface.sequelize.QueryTypes.RAW
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('ALTER TABLE "detections" RENAME TO "detections_old";', { type, transaction })

      await queryInterface.createTable('detections', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        start: {
          // Hypertable key
          type: Sequelize.DATE(3),
          allowNull: false,
          primaryKey: true
        },
        end: {
          type: Sequelize.DATE(3),
          allowNull: false
        },
        stream_id: {
          type: Sequelize.STRING(12),
          allowNull: false,
          references: {
            model: {
              tableName: 'streams'
            },
            key: 'id'
          }
        },
        classification_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'classifications'
            },
            key: 'id'
          }
        },
        classifier_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'classifiers'
            },
            key: 'id'
          }
        },
        confidence: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        review_status: {
          type: Sequelize.SMALLINT,
          allowNull: true,
          default: null
        },
        classifier_job_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'classifier_jobs'
            },
            key: 'id'
          }
        }
      }, { transaction })

      await queryInterface.sequelize.query('SELECT create_hypertable(\'detections\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      }, { transaction })

      await queryInterface.sequelize.query('CREATE INDEX detections_stream_id_start_confidence_review_status ON detections USING btree (stream_id, start, confidence, review_status)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      }, { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    const type = queryInterface.sequelize.QueryTypes.RAW
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.dropTable('detections', { transaction })
      await queryInterface.sequelize.query('ALTER TABLE "detections_old" RENAME TO "detections";', { type, transaction })
    })
  }
}
