'use strict';

module.exports = {
  up: function (queryInterface, Sequelize, done) {
    queryInterface.changeColumn(
      'Guardians',
      'latitude',
      {
        type: Sequelize.FLOAT,
        allowNull: true,
        defaultValue: 0.0,
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
        defaultValue: 0.0,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    );

    queryInterface.sequelize.query('UPDATE `Guardians` AS `Guardian` SET `Guardian`.`latitude` = 0.0 WHERE `Guardian`.`latitude` IS NULL;');
    queryInterface.sequelize.query('UPDATE `Guardians` AS `Guardian` SET `Guardian`.`longitude` = 0.0 WHERE `Guardian`.`longitude` IS NULL;');

    done();
  },

  down: function (queryInterface, Sequelize, done) {

    queryInterface.changeColumn(
      'Guardians',
      'latitude',
      {
        type: DataTypes.FLOAT,
        allowNull: true,
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
        type: DataTypes.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    );

    queryInterface.sequelize.query('UPDATE `Guardians` AS `Guardian` SET `Guardian`.`latitude` = NULL WHERE `Guardian`.`latitude` IS 0;');
    queryInterface.sequelize.query('UPDATE `Guardians` AS `Guardian` SET `Guardian`.`longitude` = NULL WHERE `Guardian`.`longitude` IS 0;');

    done();

  }
};
