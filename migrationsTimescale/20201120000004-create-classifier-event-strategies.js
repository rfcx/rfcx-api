'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_event_strategies', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
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
      event_strategy_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'event_strategies'
          },
          key: 'id'
        }
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      parameters: {
        type: Sequelize.STRING
      },
      last_executed_at: {
        type: Sequelize.DATE(3)
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_event_strategies')
  }
}
