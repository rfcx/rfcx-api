'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('annotations', {
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
        primaryKey: true
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: false
      },
      frequency_min: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      frequency_max: {
        type: Sequelize.INTEGER,
        allowNull: false
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
      stream_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        }
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
    }).then(() => {
      queryInterface.sequelize.query('SELECT create_hypertable(\'annotations\', \'start\')', {
        type: queryInterface.sequelize.QueryTypes.RAW
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('annotations')
  }
}