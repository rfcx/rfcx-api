'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'GuardianAudioEvents',
      'audio_guid',
      {
        type: Sequelize.UUID,
        allowNull: true,
        defaultValue: null
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('GuardianAudioEvents', 'audio_guid');

  }
};
