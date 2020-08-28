'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.createTable('Messages', {
      guid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true
      },
      time: {
        type: Sequelize.DATE(3),
        defaultValue: Sequelize.NOW,
        validate: {
          isDate: true
        }
      },
      latitude: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -90,
          max: 90
        }
      },
      longitude: {
        type: Sequelize.FLOAT,
        allowNull: true,
        validate: {
          isFloat: true,
          min: -180,
          max: 180
        }
      }
    })
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.dropTable('Messages')
  }
}
