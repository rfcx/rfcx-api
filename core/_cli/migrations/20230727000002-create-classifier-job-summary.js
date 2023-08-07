'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_job_summaries', {
      classifier_job_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'classifier_jobs'
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
      total: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
      },
      confirmed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
      },
      rejected: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
      },
      uncertain: {
        type: Sequelize.INTEGER,
        allowNull: false,
        default: 0
      }
    }).then(() => {
      return queryInterface.sequelize.query('CREATE INDEX "classifier_job_summaries_classifier_job_id_classifier_id" ON classifier_job_summaries using btree (classifier_job_id, classification_id);')
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_job_summaries')
  }
}
