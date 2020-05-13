'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'GuardianAudioHighlights',
      'flickr_photoset_id',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('GuardianAudioHighlights', 'flickr_photoset_id');

  }
};
