'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return queryInterface.createTable('Attachments', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true
      },
      reported_at: {
        type: Sequelize.DATE,
        allowNull: false,
        validate: {
          isDate: true
        }
      },
      s3Path: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
    });

  },

  down: function (queryInterface, Sequelize) {

    return queryInterface.dropTable('Attachments');

  }
};
