'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifier_outputs', 'ignore', { transaction: t })
      await queryInterface.addColumn('classifier_outputs', 'ignore_threshold',
        { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0.5 }, { transaction: t }
      )
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifier_outputs', 'ignore_threshold', { transaction: t })
      await queryInterface.addColumn('classifier_outputs', 'ignore',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction: t }
      )
    })
  }
}
