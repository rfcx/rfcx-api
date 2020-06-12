'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('streams', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      start: {
        type: Sequelize.DATE(3),
        allowNull: false,
      },
      end: {
        type: Sequelize.DATE(3),
        allowNull: false,
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
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('streams')
  }
}
