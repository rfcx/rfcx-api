'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaAssetExchangeLogs', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        asset_type: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        asset_id: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
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
      await queryInterface.addIndex('GuardianMetaAssetExchangeLogs', ['guardian_id', 'asset_type', 'asset_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaAssetExchangeLogs')
  }
}
