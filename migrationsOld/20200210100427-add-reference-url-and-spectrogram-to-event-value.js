'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.addColumn(
        'GuardianAudioEventValues',
        'reference_audio',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      ),
      queryInterface.addColumn(
        'GuardianAudioEventValues',
        'reference_spectrogram',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.removeColumn('GuardianAudioEventValues', 'reference_audio'),
      queryInterface.removeColumn('GuardianAudioEventValues', 'reference_spectrogram')
    ])
  }
};
