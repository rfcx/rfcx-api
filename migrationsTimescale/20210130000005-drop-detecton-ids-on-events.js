'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('events', 'first_detection_id', { transaction: t })
      await queryInterface.removeColumn('events', 'last_detection_id', { transaction: t })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('events', 'first_detection_id', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction: t })
      await queryInterface.addColumn('events', 'last_detection_id', {
        type: Sequelize.STRING,
        allowNull: false
      }, { transaction: t })
    })
  }
}
