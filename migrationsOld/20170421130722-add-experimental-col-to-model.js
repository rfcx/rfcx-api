'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'AudioAnalysisModels',
      'experimental',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('AudioAnalysisModels', 'experimental')
  }
}
