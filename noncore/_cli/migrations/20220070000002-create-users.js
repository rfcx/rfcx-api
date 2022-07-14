'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('Users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false
        },
        guid: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          unique: true
        },
        type: {
          type: Sequelize.STRING,
          allowNull: true
        },
        username: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        firstname: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        lastname: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        email: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        subscription_email: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        is_email_validated: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        last_login_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        auth_password_salt: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_password_hash: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        },
        auth_password_updated_at: {
          type: Sequelize.DATE(3),
          defaultValue: Sequelize.NOW
        },
        rfcx_system: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },
        picture: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        is_super: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        default_site: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          references: {
            model: {
              tableName: 'GuardianSites'
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
      await queryInterface.addIndex('Users', ['guid'], { transaction })
      await queryInterface.addIndex('Users', ['email'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianSites')
  }
}
