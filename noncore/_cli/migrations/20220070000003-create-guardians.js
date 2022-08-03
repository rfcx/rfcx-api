'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('Guardians', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          autoIncrement: true
        },
        guid: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        shortname: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        is_certified: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        is_visible: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        phone_number: {
          type: Sequelize.STRING,
          allowNull: true
        },
        carrier_name: {
          type: Sequelize.STRING,
          allowNull: true
        },
        sim_card_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        is_updatable: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        latitude: {
          type: Sequelize.DOUBLE,
          allowNull: true
        },
        longitude: {
          type: Sequelize.DOUBLE,
          allowNull: true
        },
        cartodb_coverage_id: {
          type: Sequelize.UUID,
          unique: false,
          allowNull: true
        },
        last_check_in: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        check_in_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        last_update_check_in: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        update_check_in_count: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        prefs_audio_capture_interval: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        prefs_service_monitor_interval: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        auth_token_salt: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_token_hash: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_token_updated_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        auth_token_expires_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        auth_pin_code: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        notes: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        is_private: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        stream_id: {
          type: Sequelize.STRING(12),
          allowNull: true
        },
        project_id: {
          type: Sequelize.STRING(12),
          allowNull: true
        },
        timezone: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        last_deployed: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        last_ping: {
          type: Sequelize.DATE(3),
          allowNull: true
        },
        last_audio_sync: {
          type: Sequelize.DATE(3),
          allowNull: true,
          defaultValue: null
        },
        last_battery_main: {
          type: Sequelize.FLOAT,
          allowNull: true,
          defaultValue: null
        },
        last_battery_internal: {
          type: Sequelize.FLOAT,
          allowNull: true,
          defaultValue: null
        },
        site_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'GuardianSites'
            },
            key: 'id'
          }
        },
        creator: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Users'
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
      await queryInterface.addIndex('Guardians', ['guid'], { transaction })
      await queryInterface.addIndex('Guardians', ['shortname'], { transaction })
      await queryInterface.addConstraint('Guardians', {
        type: 'CHECK',
        fields: ['latitude'],
        where: {
          latitude: {
            [Sequelize.Op.and]: {
              [Sequelize.Op.gte]: -90,
              [Sequelize.Op.lte]: 90
            }
          }
        },
        transaction
      })
      await queryInterface.addConstraint('Guardians', {
        type: 'CHECK',
        fields: ['longitude'],
        where: {
          longitude: {
            [Sequelize.Op.and]: {
              [Sequelize.Op.gte]: -180,
              [Sequelize.Op.lte]: 180
            }
          }
        },
        transaction
      })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Guardians')
  }
}
