'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSegmentsGroupLogs', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        group_guid: {
          type: Sequelize.STRING
        },
        segment_count: {
          type: Sequelize.INTEGER
        },
        protocol: {
          type: Sequelize.STRING
        },
        type: {
          type: Sequelize.STRING
        },
        payload: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        guardian_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Guardians'
            },
            key: 'id'
          }
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      await queryInterface.addIndex('GuardianMetaSegmentsGroupLogs', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianMetaSegmentsGroupLogs', ['group_guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSegmentsGroupLogs')
  }
}
