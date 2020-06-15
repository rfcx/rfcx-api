'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('streams', {
      id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      start: {
        type: Sequelize.DATE(3),
        allowNull: true,
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: true,
      },
      is_private: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      location_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: {
            tableName: 'locations'
          },
          key: 'id'
        },
      },
      max_sample_rate_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'sample_rates'
          },
          key: 'id'
        },
      },
      created_by_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        },
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('streams')
  }
}
