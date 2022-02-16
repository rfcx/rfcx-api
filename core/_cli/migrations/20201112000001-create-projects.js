'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('projects', {
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
      is_public: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      organization_id: {
        type: Sequelize.STRING(12),
        allowNull: true,
        references: {
          model: {
            tableName: 'organizations'
          },
          key: 'id'
        }
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
      external_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('projects')
  }
}
