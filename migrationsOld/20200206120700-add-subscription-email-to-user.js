'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Users',
      'subscription_email',
      {
        type: Sequelize.STRING,
        allowNull: true,
        unique: false,
        validate: {
          isEmail: true
        }
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Users', 'subscription_email')
  }
}
