'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Segments',
      'sample_count',
      {
        type: Sequelize.INTEGER.UNSIGNED,
        validate: {
          isInt: true,
          min: {
            args: [1],
            msg: 'sample_count should be equal to or greater than 1'
          }
        }
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Segments', 'sample_count')
  }
}
