'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaLogs', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        captured_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        url: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        sha1_checksum: {
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
      await queryInterface.addIndex('GuardianMetaLogs', ['guardian_id'], { transaction })
      await queryInterface.addIndex('GuardianMetaLogs', ['sha1_checksum'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaLogs')
  }
}
