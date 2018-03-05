'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('GuardianAudioEventReasonsForCreation', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('GuardianAudioEventReasonsForCreation');

  }
};
