'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('ContactMessages', {
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
      },
      message: {
        type: Sequelize.TEXT('long'),
        allowNull: true
      }
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('ContactMessages');

  }
};
