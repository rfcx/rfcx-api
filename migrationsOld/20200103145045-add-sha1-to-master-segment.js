'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.addColumn(
      'MasterSegments',
      'sha1_checksum',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false, // it will be unique only at stream level
        validate: {
        }
      }
    );

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.removeColumn('MasterSegments', 'sha1_checksum');

  }
};
