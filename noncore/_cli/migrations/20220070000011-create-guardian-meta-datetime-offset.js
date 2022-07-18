'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaDateTimeOffsets', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        source: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false,
          validate: {
          }
        },
        system_clock_offset: {
          type: Sequelize.INTEGER,
          allowNull: true,
          validate: {
            isInt: true
          }
        },
        system_clock_timezone: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false,
          validate: {
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaDateTimeOffsets\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaDateTimeOffsets', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaDateTimeOffsets')
  }
}
