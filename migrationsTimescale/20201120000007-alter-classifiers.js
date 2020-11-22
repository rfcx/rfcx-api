'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifiers', 'min_confidence', { transaction: t }),
        queryInterface.removeColumn('classifiers', 'min_windows_count', { transaction: t }),
        queryInterface.addColumn('classifiers', 'external_id', { type: Sequelize.STRING }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'created_by_id', {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'users'
            },
            key: 'id'
          },
          defaultValue: 1
        }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'model_runner', { type: Sequelize.STRING, allowNull: false, defaultValue: '' }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'model_url', { type: Sequelize.STRING, allowNull: false, defaultValue: '' }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'last_executed_at', { type: Sequelize.DATE(3) }, { transaction: t })
      ]).then(() => {
        return queryInterface.sequelize.query('UPDATE classifiers SET external_id = uuid', { transaction: t })
      }).then(() => {
        return queryInterface.removeColumn('classifiers', 'uuid', { transaction: t })
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifiers', 'last_executed_at', { transaction: t }),
        queryInterface.removeColumn('classifiers', 'model_url', { transaction: t }),
        queryInterface.removeColumn('classifiers', 'model_runner', { transaction: t }),
        queryInterface.removeColumn('classifiers', 'created_by_id', { transaction: t }),
        queryInterface.removeColumn('classifiers', 'external_id', { transaction: t }),
        queryInterface.addColumn('classifiers', 'min_windows_count', { type: Sequelize.INTEGER }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'min_confidence', { type: Sequelize.FLOAT }, { transaction: t }),
        queryInterface.addColumn('classifiers', 'uuid', {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          unique: true,
          allowNull: false
        }, { transaction: t })
      ])
    })
  }
}
