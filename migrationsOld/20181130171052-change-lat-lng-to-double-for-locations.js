'use strict'

module.exports = {
  up: function (queryInterface, Sequelize, done) {
    queryInterface.changeColumn(
      'UserLocations',
      'latitude',
      {
        type: Sequelize.DOUBLE,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [-90],
            msg: 'latitude should be equal to or greater than -90'
          },
          max: {
            args: [90],
            msg: 'latitude should be equal to or less than 90'
          }
        }
      }
    )

    queryInterface.changeColumn(
      'UserLocations',
      'longitude',
      {
        type: Sequelize.DOUBLE,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [-180],
            msg: 'longitude should be equal to or greater than -180'
          },
          max: {
            args: [180],
            msg: 'longitude should be equal to or less than 180'
          }
        }
      }
    )

    done()
  },

  down: function (queryInterface, Sequelize, done) {
    queryInterface.changeColumn(
      'UserLocations',
      'latitude',
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [-90],
            msg: 'latitude should be equal to or greater than -90'
          },
          max: {
            args: [90],
            msg: 'latitude should be equal to or less than 90'
          }
        }
      }
    )

    queryInterface.changeColumn(
      'UserLocations',
      'longitude',
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [-180],
            msg: 'longitude should be equal to or greater than -180'
          },
          max: {
            args: [180],
            msg: 'longitude should be equal to or less than 180'
          }
        }
      }
    )

    done()
  }
}
