'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.changeColumn(
        'Segments',
        'starts',
        {
          type: Sequelize.BIGINT.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'starts should be equal to or greater than 0'
            },
            max: {
              args: [32503669200000],
              msg: 'starts should be equal to or less than 32503669200000'
            }
          }
        }
      ),
      queryInterface.changeColumn(
        'Segments',
        'ends',
        {
          type: Sequelize.BIGINT.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'ends should be equal to or greater than 0'
            },
            max: {
              args: [32503669200000],
              msg: 'ends should be equal to or less than 32503669200000'
            }
          }
        }
      ),
      queryInterface.changeColumn(
        'Streams',
        'starts',
        {
          type: Sequelize.BIGINT.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'starts should be equal to or greater than 0'
            },
            max: {
              args: [32503669200000],
              msg: 'starts should be equal to or less than 32503669200000'
            }
          }
        }
      ),
      queryInterface.changeColumn(
        'Streams',
        'ends',
        {
          type: Sequelize.BIGINT.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'ends should be equal to or greater than 0'
            },
            max: {
              args: [32503669200000],
              msg: 'ends should be equal to or less than 32503669200000'
            }
          }
        }
      )

    ])
  },

  down: function (queryInterface, Sequelize) {
    return Promise.all([
      queryInterface.changeColumn(
        'Segments',
        'starts',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'starts should be equal to or greater than 0'
            },
            max: {
              args: [4294967295],
              msg: 'starts should be equal to or less than 4294967295'
            }
          }
        }
      ),
      queryInterface.changeColumn(
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
      ),
      queryInterface.changeColumn(
        'Streams',
        'starts',
        {
          type: Sequelize.INTEGER.UNSIGNED,
          validate: {
            isInt: true,
            min: {
              args: [0],
              msg: 'starts should be equal to or greater than 0'
            },
            max: {
              args: [4294967295],
              msg: 'starts should be equal to or less than 4294967295'
            }
          }
        }
      ),
      queryInterface.changeColumn(
        'Streams',
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
  }

}
