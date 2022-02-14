'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('annotations', 'is_manual', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction: t })
      await queryInterface.addColumn('annotations', 'is_positive', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('annotations', 'is_manual', { transaction: t })
      await queryInterface.removeColumn('annotations', 'is_positive', { transaction: t })
    })
  }
}
