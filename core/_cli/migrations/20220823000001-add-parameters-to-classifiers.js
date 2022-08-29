'use strict'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('classifiers', 'parameters', { type: Sequelize.STRING(255), defaultValue: null, allowNull: true }, { transaction })
      await queryInterface.removeColumn('classifier_deployments', 'deployment_parameters', { transaction })
    })
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn('classifiers', 'parameters', { transaction })
      await queryInterface.addColumn('classifier_deployments', 'deployment_parameters', { type: Sequelize.STRING(255), defaultValue: null, allowNull: true }, { transaction })
    })
  }
}
