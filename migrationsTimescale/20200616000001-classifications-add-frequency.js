'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('classifications', 'frequency_min', {
          type: Sequelize.INTEGER
        }, { transaction: t }),
        queryInterface.addColumn('classifications', 'frequency_max', {
          type: Sequelize.INTEGER,
        }, { transaction: t })
      ])
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('classifications', 'frequency_min', { transaction: t }),
        queryInterface.removeColumn('classifications', 'frequency_max', { transaction: t })
      ])
    })
  }
}