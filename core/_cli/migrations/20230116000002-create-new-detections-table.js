'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('detections', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
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
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        }
      }, { transaction })
      const type = queryInterface.sequelize.QueryTypes.RAW
      await queryInterface.sequelize.query('SELECT create_hypertable(\'detections\', \'start\')', {
        type, transaction
      })
      await queryInterface.sequelize.query(
        'CREATE INDEX detections_stream_id_start_confidence_review ON detections (stream_id, start, confidence, review_status);',
        { type, transaction }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detections')
  }
}
