'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    // Add hidden
    return queryInterface.addColumn('stream_segments', 'path', {
      type: Sequelize.STRING(23),
      allowNull: true
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('stream_segments', 'path')
  }
}
