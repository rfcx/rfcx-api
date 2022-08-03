'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSegmentsQueue', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        group_guid: {
          type: Sequelize.STRING,
          allowNull: false
        },
        segment_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        queued_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        protocol: {
          type: Sequelize.STRING,
          allowNull: true
        },
        dispatch_attempts: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        received_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        body: {
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
      await queryInterface.addIndex('GuardianMetaSegmentsQueue', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianMetaSegmentsQueue', ['group_guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSegmentsQueue')
  }
}
