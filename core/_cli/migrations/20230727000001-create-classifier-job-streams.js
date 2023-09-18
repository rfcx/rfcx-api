'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('classifier_job_streams', {
      classifier_job_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        references: {
          model: {
            tableName: 'classifier_jobs'
          },
          key: 'id'
        }
      },
      stream_id: {
        type: Sequelize.STRING(12),
        allowNull: false,
        primaryKey: true,
        references: {
          model: {
            tableName: 'streams'
          },
          key: 'id'
        }
      }
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_job_streams')
  }
}
