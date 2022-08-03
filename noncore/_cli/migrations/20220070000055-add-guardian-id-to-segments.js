'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'GuardianMetaSegmentsReceived',
      'guardian_id',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'Guardians'
          },
          key: 'id'
        }
      }
    )
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('GuardianMetaSegmentsReceived', 'guardian_id')
  }
}
