'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('annotations', 'is_manual', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction: t }),
        queryInterface.addColumn('annotations', 'is_positive', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, { transaction: t })
      ])
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('annotations', 'is_manual', { transaction: t }),
        queryInterface.removeColumn('annotations', 'is_positive', { transaction: t })
      ])
    })
  }
}
