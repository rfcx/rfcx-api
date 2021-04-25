'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('projects', 'min_latitude',
        { type: Sequelize.REAL, allowNull: true }, { transaction: t })
      await queryInterface.addColumn('projects', 'max_latitude',
        { type: Sequelize.REAL, allowNull: true }, { transaction: t })
      await queryInterface.addColumn('projects', 'min_longitude',
        { type: Sequelize.REAL, allowNull: true }, { transaction: t })
      await queryInterface.addColumn('projects', 'max_longitude',
        { type: Sequelize.REAL, allowNull: true }, { transaction: t })
      await queryInterface.changeColumn('streams', 'latitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('streams', 'longitude',
        { type: Sequelize.REAL }, { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('projects', 'min_latitude', { transaction: t })
      await queryInterface.removeColumn('projects', 'max_latitude', { transaction: t })
      await queryInterface.removeColumn('projects', 'min_longitude', { transaction: t })
      await queryInterface.removeColumn('projects', 'max_longitude', { transaction: t })
      await queryInterface.changeColumn('streams', 'latitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('streams', 'longitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
    })
  }
}
