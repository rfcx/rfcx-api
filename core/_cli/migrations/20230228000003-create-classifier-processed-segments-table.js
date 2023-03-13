'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.resolve().then(() => {
      return queryInterface.createTable('classifier_processed_segments', {
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
        start: {
          // Hypertable key
          type: Sequelize.DATE(3),
          allowNull: false,
          primaryKey: true
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
      })
    }).then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'classifier_processed_segments\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX classifier_processed_segments_stream_id_start ON classifier_processed_segments USING btree (stream_id, start)', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_processed_segments')
  }
}
