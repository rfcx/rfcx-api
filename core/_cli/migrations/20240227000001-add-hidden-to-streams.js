'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    // Add hidden
    return queryInterface.addColumn('streams', 'hidden', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'hidden')
  }
}
