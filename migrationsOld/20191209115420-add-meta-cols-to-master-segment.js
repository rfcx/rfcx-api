'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.addColumn(
        'MasterSegments',
        'duration',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [1],
              msg: 'duration should be equal to or greater than 1'
            }
          }
        }
      ),
      queryInterface.addColumn(
        'MasterSegments',
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
      ),
      queryInterface.addColumn(
        'MasterSegments',
        'channels_count',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [1],
              msg: 'channels_count should be equal to or greater than 1'
            }
          }
        }
      ),
      queryInterface.addColumn(
        'MasterSegments',
        'bit_rate',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [1],
              msg: 'bit_rate should be equal to or greater than 1'
            }
          }
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.removeColumn('MasterSegments', 'duration'),
      queryInterface.removeColumn('MasterSegments', 'sample_count'),
      queryInterface.removeColumn('MasterSegments', 'channels_count'),
      queryInterface.removeColumn('MasterSegments', 'bit_rate')
    ])
  }

}
