'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.changeColumn(
      'Streams',
      'guid',
      {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: {
        }
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.changeColumn(
      'Streams',
      'guid',
      {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        unique: true
      }
    )
  }
}
