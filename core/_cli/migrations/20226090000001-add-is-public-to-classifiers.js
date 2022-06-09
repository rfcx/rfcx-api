'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.addColumn('classifiers', 'is_public', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction: t })
    })
      .then(() => {
        return queryInterface.sequelize.query('UPDATE classifiers SET is_public = true')
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      await queryInterface.removeColumn('classifiers', 'is_public', { transaction: t })
    })
  }
}
