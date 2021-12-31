'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.changeColumn('projects', 'min_latitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('projects', 'max_latitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('projects', 'min_longitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('projects', 'max_longitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('streams', 'latitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('streams', 'longitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
      await queryInterface.changeColumn('streams', 'altitude',
        { type: Sequelize.DOUBLE }, { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.changeColumn('projects', 'min_latitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('projects', 'max_latitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('projects', 'min_longitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('projects', 'max_longitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('streams', 'latitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('streams', 'longitude',
        { type: Sequelize.REAL }, { transaction: t })
      await queryInterface.changeColumn('streams', 'altitude',
        { type: Sequelize.REAL }, { transaction: t })
    })
  }
}
