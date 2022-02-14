'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'streams',
      'project_id',
      {
        type: Sequelize.STRING(12),
        allowNull: true,
        references: {
          model: {
            tableName: 'projects'
          },
          key: 'id'
        }
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('streams', 'project_id')
  }
}
