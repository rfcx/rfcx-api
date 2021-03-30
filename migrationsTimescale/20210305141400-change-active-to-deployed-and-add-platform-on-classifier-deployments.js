'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifier_deployments', 'active', { transaction: t })
      await queryInterface.addColumn('classifier_deployments', 'deployed',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
      )
      await queryInterface.addColumn('classifier_deployments', 'platform',
        { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'aws' }, { transaction: t }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifier_deployments', 'deployed', { transaction: t })
      await queryInterface.removeColumn('classifier_deployments', 'platform', { transaction: t })
      await queryInterface.addColumn('classifier_deployments', 'active',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
      )
    })
  }
}
