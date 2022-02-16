'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('index_values', {
      time: {
        // Hypertable key
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
      index_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'indices'
          },
          key: 'id'
        }
      },
      value: {
        type: Sequelize.FLOAT,
        allowNull: false
      }
    }).then(() => {
      return queryInterface.sequelize.query('SELECT create_hypertable(\'index_values\', \'time\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('index_values')
  }
}
