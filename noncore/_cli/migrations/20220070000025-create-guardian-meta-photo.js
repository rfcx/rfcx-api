'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaPhotos', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        captured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        width: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        height: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        format: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sha1_checksum: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        metadata: {
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaPhotos\"', 'captured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaPhotos', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianMetaPhotos', ['sha1_checksum'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaPhotos')
  }
}
