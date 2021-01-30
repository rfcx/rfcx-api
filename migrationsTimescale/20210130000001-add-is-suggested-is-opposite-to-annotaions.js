'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('annotations', 'is_suggested', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction: t }),
        queryInterface.addColumn('annotations', 'is_opposite', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        }, { transaction: t })
      ])
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('annotations', 'is_suggested', { transaction: t }),
        queryInterface.removeColumn('annotations', 'is_opposite', { transaction: t })
      ])
    })
  }
}
