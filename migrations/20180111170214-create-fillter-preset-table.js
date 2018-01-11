'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('FilterPresets', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      },
      type: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        validate: {
        }
      },
      json: {
        type: Sequelize.TEXT('long'),
        allowNull: false
      }
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('FilterPresets');

  }
};
