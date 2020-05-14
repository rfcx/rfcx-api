'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('AttachmentTypes', {
      type: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('AttachmentTypes');

  }
};
