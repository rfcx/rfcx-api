'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'GuardianAudioEvents',
      'reviewer_confirmed',
      {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: null
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('GuardianAudioEvents', 'reviewer_confirmed');

  }
};
