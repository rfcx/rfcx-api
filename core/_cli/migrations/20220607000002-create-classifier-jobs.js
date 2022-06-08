'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable('classifier_jobs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true
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
        query_streams: {
          type: Sequelize.STRING,
          allowNull: true
        },
        query_start: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        query_end: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        query_hours: {
          type: Sequelize.STRING,
          allowNull: true
        },
        segments_total: {
          type: Sequelize.INTEGER,
          defaultValue: -1,
          allowNull: false
        },
        segments_completed: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false
        },
        status: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
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
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        started_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        completed_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      }, { transaction })
      await queryInterface.sequelize.query('CREATE INDEX "classifier_jobs_project_id" ON classifier_jobs using btree (project_id);', { transaction })
      await queryInterface.sequelize.query('CREATE INDEX "classifier_jobs_status" ON classifier_jobs using btree (status);', { transaction })
      await queryInterface.sequelize.query('CREATE INDEX "classifier_jobs_created_by_id" ON classifier_jobs using btree (created_by_id);', { transaction })
      await queryInterface.sequelize.query('CREATE INDEX "classifier_jobs_created_at" ON classifier_jobs using btree (created_at);', { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('classifier_jobs')
  }
}
