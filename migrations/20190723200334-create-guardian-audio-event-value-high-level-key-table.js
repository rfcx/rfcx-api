'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('GuardianAudioEventValueHighLevelKeys', {
      value: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('GuardianAudioEventValueHighLevelKeys');

  }
};
