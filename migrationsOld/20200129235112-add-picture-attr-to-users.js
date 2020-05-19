'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'Users',
      'picture',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('Users', 'picture');

  }
};
