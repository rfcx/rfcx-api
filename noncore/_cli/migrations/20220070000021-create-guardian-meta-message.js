'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaMessages', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        received_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        sent_at: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        address: {
          type: Sequelize.STRING,
          allowNull: true
        },
        body: {
          type: Sequelize.STRING,
          allowNull: true
        },
        android_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          validate: {
            isInt: true,
            min: 0
          }
        },
        check_in_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'GuardianCheckIns'
            },
            key: 'id'
          }
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaMessages\"', 'received_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaMessages', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaMessages')
  }
}
