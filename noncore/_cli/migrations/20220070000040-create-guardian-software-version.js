'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianSoftwareVersions', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        version: {
          type: Sequelize.STRING,
          allowNull: false
        },
        release_date: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        is_available: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        sha1_checksum: {
          type: Sequelize.STRING,
          allowNull: true
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        software_role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'GuardianSoftware'
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
      await queryInterface.addIndex('GuardianSoftwareVersions', ['software_role_id'], { transaction })
      await queryInterface.addIndex('GuardianSoftwareVersions', ['version'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianSoftwareVersions')
  }
}
