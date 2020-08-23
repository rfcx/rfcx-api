'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'Streams',
      'marked_as_deleted_at',
      {
        type: Sequelize.DATE(3),
        allowNull: true,
        defaultValue: null,
        validate: {
          isDate: true
        }
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('Streams', 'marked_as_deleted_at')
  }
}
