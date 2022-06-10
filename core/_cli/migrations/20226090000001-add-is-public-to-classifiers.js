'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn('classifiers', 'is_public', { type: Sequelize.BOOLEAN, defaultValue: false, allowNull: false }, { transaction })
      await queryInterface.sequelize.query('UPDATE classifiers SET is_public = true;', { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('classifiers', 'is_public')
  }
}
