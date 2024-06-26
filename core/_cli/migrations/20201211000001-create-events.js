'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      start: {
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
      classifier_event_strategy_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'classifier_event_strategies'
          },
          key: 'id'
        }
      },
      first_detection_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      last_detection_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    }).then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'events\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('events')
  }
}
