'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifiers', 'min_confidence', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'min_windows_count', { transaction: t })
      await queryInterface.addColumn('classifiers', 'external_id', { type: Sequelize.STRING }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'created_by_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'users'
          },
          key: 'id'
        },
        defaultValue: 1
      }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'model_runner', { type: Sequelize.STRING, allowNull: false, defaultValue: '' }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'model_url', { type: Sequelize.STRING, allowNull: false, defaultValue: '' }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'last_executed_at', { type: Sequelize.DATE(3) }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'created_at', { type: Sequelize.DATE(3), allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'updated_at', { type: Sequelize.DATE(3), allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }, { transaction: t })
    })
      .then(() => {
        return queryInterface.sequelize.query('UPDATE classifiers SET external_id = uuid')
      }).then(() => {
        return queryInterface.removeColumn('classifiers', 'uuid')
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifiers', 'updated_at', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'created_at', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'last_executed_at', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'model_url', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'model_runner', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'created_by_id', { transaction: t })
      await queryInterface.removeColumn('classifiers', 'external_id', { transaction: t })
      await queryInterface.addColumn('classifiers', 'min_windows_count', { type: Sequelize.INTEGER }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'min_confidence', { type: Sequelize.FLOAT }, { transaction: t })
      await queryInterface.addColumn('classifiers', 'uuid', {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
        allowNull: false
      }, { transaction: t })
    })
  }
}
