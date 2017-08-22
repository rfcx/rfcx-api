'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'GuardianAudioHighlights',
      'video360_url',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('GuardianAudioHighlights', 'video360_url');

  }
};
