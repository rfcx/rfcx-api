'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('classifier_deployments', 'platform',
          { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'aws' }, { transaction: t }
        )
      ])
    })
  },
  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifier_deployments', 'platform', { transaction: t })
      ])
    })
  }
}
