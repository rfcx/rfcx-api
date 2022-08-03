'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaVideos', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
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
          type: Sequelize.STRING
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
        length: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        format: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sha1_checksum: {
          type: Sequelize.STRING
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaVideos\"', 'captured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaVideos', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaVideos')
  }
}
