'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.addColumn('projects', 'min_latitude', {
          type: Sequelize.DOUBLE,
          allowNull: true
        }, { transaction: t }),
        queryInterface.addColumn('projects', 'max_latitude', {
          type: Sequelize.DOUBLE,
          allowNull: true
        }, { transaction: t }),
        queryInterface.addColumn('projects', 'min_longitude', {
          type: Sequelize.DOUBLE,
          allowNull: true
        }, { transaction: t }),
        queryInterface.addColumn('projects', 'max_longitude', {
          type: Sequelize.DOUBLE,
          allowNull: true
        }, { transaction: t })
      ])
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(t => {
      return Promise.all([
        queryInterface.removeColumn('projects', 'min_latitude', { transaction: t }),
        queryInterface.removeColumn('projects', 'max_latitude', { transaction: t }),
        queryInterface.removeColumn('projects', 'min_longitude', { transaction: t }),
        queryInterface.removeColumn('projects', 'max_longitude', { transaction: t })
      ])
    })
  }
}
