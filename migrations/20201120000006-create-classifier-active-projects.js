'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_active_projects', {
      classifier_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: {
            tableName: 'classifiers'
          },
          key: 'id'
        }
      },
      project_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        primaryKey: true,
        references: {
          model: {
            tableName: 'projects'
          },
          key: 'id'
        }
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_active_projects')
  }
}
