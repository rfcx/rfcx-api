'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_active_projects', {
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
      project_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'projects'
          },
          key: 'id'
        }
      }
    }).then(() => {
      return queryInterface.sequelize.query('ALTER TABLE "classifier_active_projects" ADD CONSTRAINT "pk_composite" PRIMARY KEY ("classifier_id", "project_id")')
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_active_projects')
  }
}
