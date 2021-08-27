'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('detections', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
      },
      start: {
        type: Sequelize.DATE(3),
        allowNull: false
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
        allowNull: false,
        defaultValue: 0
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('detections')
  }
}
