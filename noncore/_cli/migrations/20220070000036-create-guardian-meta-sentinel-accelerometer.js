'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianMetaSentinelAccelerometer', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true
        },
        measured_at: {
          type: Sequelize.DATE(3),
          primaryKey: true
        },
        x_milli_g_force_accel: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        y_milli_g_force_accel: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        z_milli_g_force_accel: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        sample_count: {
          type: Sequelize.INTEGER,
          defaultValue: 1
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
      await queryInterface.sequelize.query("SELECT create_hypertable('\"GuardianMetaSentinelAccelerometer\"', 'measured_at')", {
        type: queryInterface.sequelize.QueryTypes.RAW,
        transaction
      })
      await queryInterface.addIndex('GuardianMetaSentinelAccelerometer', ['guardian_id'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianMetaSentinelAccelerometer')
  }
}
