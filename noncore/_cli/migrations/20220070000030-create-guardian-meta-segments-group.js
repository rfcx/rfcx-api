'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSegmentsGroups', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.STRING,
          allowNull: false
        },
        segment_count: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        protocol: {
          type: Sequelize.STRING,
          allowNull: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: true
        },
        checksum_snippet: {
          type: Sequelize.STRING,
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
      await queryInterface.addIndex('GuardianMetaSegmentsGroups', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianMetaSegmentsGroups', ['guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSegmentsGroups')
  }
}
