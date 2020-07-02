'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface
      .createTable('audio_codecs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          allowNull: false,
          primaryKey: true,
        },
        value: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        },
      })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('audio_codecs')
  }
}
