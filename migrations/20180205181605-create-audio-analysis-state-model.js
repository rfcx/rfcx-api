'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('AudioAnalysisStates', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: false,
        validate: {
        }
      },
      description: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: false,
        validate: {
        }
      },
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('AudioAnalysisStates');

  }
};
