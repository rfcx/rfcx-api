'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'Users',
      'rfcx_system',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        validate: {
        }
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('Users', 'rfcx_system');

  }
};
