'use strict';

module.exports = {
  up: function (queryInterface, Sequelize, done) {

    queryInterface.changeColumn(
      'Guardians',
      'latitude',
      {
        type: Sequelize.DOUBLE,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [ -90 ],
            msg: 'latitude should be equal to or greater than -90'
          },
          max: {
            args: [ 90 ],
            msg: 'latitude should be equal to or less than 90'
          }
        }
      }
    );

    queryInterface.changeColumn(
      'Guardians',
      'longitude',
      {
        type: Sequelize.DOUBLE,
        allowNull: false,
        validate: {
          isFloat: true,
          min: {
            args: [ -180 ],
            msg: 'longitude should be equal to or greater than -180'
          },
          max: {
            args: [ 180 ],
            msg: 'longitude should be equal to or less than 180'
          }
        }
      }
    );

    done();

  },

  down: function (queryInterface, Sequelize, done) {

    queryInterface.changeColumn(
      'Guardians',
      'latitude',
      {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          isFloat: true,
          min: -90,
          max: 90
        }
      }
    );

    queryInterface.changeColumn(
      'Guardians',
      'longitude',
      {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    );

    done();

  }
};
