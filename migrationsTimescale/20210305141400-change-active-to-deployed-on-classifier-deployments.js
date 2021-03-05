'use strict'
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifier_deployments', 'active', { transaction: t }),
        queryInterface.addColumn('classifier_deployments', 'deployed',
          { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
        )
      ])
    })
  },
  async down (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
          queryInterface.removeColumn('classifier_deployments', 'deployed', { transaction: t }),
          queryInterface.addColumn('classifier_deployments', 'active',
            { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
          )
      ])
    })
  }
}
