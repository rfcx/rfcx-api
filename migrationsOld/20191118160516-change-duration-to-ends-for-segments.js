'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('Segments', 'duration'),
      queryInterface.addColumn(
        'Segments',
        'ends',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'ends should be equal to or greater than 0'
            },
            max: {
              args: [4294967295],
              msg: 'ends should be equal to or less than 4294967295'
            }
          }
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('Segments', 'ends'),
      queryInterface.addColumn(
        'Segments',
        'duration',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'duration should be equal to or greater than 0'
            },
            max: {
              args: [4294967295],
              msg: 'duration should be equal to or less than 4294967295'
            }
          }
        }
      )
    ])
  }

}
