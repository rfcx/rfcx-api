'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('user_project_subscriptions', {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        }
      },
      project_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        references: {
          model: {
            tableName: 'projects'
          },
          key: 'id'
        }
      },
      subscription_type_id: {
        type: Sequelize.INTEGER,
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
      return queryInterface.sequelize.query('CREATE INDEX "user_project_subscriptions_project_id" ON user_project_subscriptions using btree (project_id);')
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX "user_project_subscriptions_user_id" ON user_project_subscriptions using btree (user_id);')
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('user_project_subscriptions')
  }
}
