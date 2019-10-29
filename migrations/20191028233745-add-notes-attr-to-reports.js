'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'Reports',
      'notes',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        defaultValue: null,
        validate: {}
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('Reports', 'notes');

  }

};
