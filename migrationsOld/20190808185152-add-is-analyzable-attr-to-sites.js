'use strict'

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'GuardianSites',
      'is_analyzable',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: true,
        validate: {}
      }
    )
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.removeColumn('GuardianSites', 'is_analyzable')
  }

}
