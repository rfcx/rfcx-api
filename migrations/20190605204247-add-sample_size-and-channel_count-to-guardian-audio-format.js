'use strict';

module.exports = {
  up: function (queryInterface, Sequelize, done) {

    queryInterface.addColumn(
      'GuardianAudioFormats',
      'sample_size',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: false,
        defaultValue: 0,
        validate: {
          isInt: true,
          min: 0,
          max: 64
        }
      }
    );

    queryInterface.addColumn(
      'GuardianAudioFormats',
      'channel_count',
      {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: false,
        defaultValue: 1,
        validate: {
          isInt: true,
          min: 0,
          max: 16
        }
      }
    );

    done();

  },

  down: function (queryInterface, Sequelize, done) {

    queryInterface.removeColumn('GuardianAudioFormats', 'sample_size');
    queryInterface.removeColumn('GuardianAudioFormats', 'channel_count');
    done();

  }

};
