'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.sequelize.query('DELETE FROM annotations WHERE is_manual IS TRUE;', { transaction })
      await queryInterface.removeColumn('annotations', 'is_manual', { transaction })
      await queryInterface.removeColumn('annotations', 'is_positive', { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('annotations', 'is_manual', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction })
      await queryInterface.addColumn('annotations', 'is_positive', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction })
    })
  }
}
