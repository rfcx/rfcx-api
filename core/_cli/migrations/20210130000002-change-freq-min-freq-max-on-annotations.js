'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.changeColumn('annotations', 'frequency_min', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction: t })
      await queryInterface.changeColumn('annotations', 'frequency_max', {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.changeColumn('annotations', 'frequency_min', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction: t })
      await queryInterface.changeColumn('annotations', 'frequency_max', {
        type: Sequelize.INTEGER,
        allowNull: false
      }, { transaction: t })
    })
  }
}
