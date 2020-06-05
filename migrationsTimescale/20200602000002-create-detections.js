'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('detections', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      start: {
        // Hypertable key
        type: Sequelize.DATE(3),
        allowNull: false,
        primaryKey: true,
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      stream_id: {
        type: Sequelize.STRING,
        allowNull: false,
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
        allowNull: false,
      },
    }).then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'detections\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detections')
  }
}