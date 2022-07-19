'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSegmentsReceived', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        group_guid: {
          type: Sequelize.STRING,
          allowNull: false
        },
        segment_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        protocol: {
          type: Sequelize.STRING,
          allowNull: true
        },
        origin_address: {
          type: Sequelize.STRING,
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
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        }
      }, { transaction })
      await queryInterface.addIndex('GuardianMetaSegmentsReceived', ['group_guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSegmentsReceived')
  }
}
