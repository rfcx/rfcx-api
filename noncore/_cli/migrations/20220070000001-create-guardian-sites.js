'use strict'
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable('GuardianSites', {
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
        name: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        description: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        is_active: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        cartodb_map_id: {
          type: Sequelize.UUID,
          unique: false,
          allowNull: true
        },
        flickr_photoset_id: {
          type: Sequelize.STRING,
          allowNull: true,
          unique: false
        },
        timezone_offset: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        timezone: {
          type: Sequelize.STRING,
          defaultValue: 'UTC',
          allowNull: false
        },
        map_image_url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        globe_icon_url: {
          type: Sequelize.STRING,
          allowNull: true
        },
        classy_campaign_id: {
          type: Sequelize.STRING,
          allowNull: true
        },
        protected_area: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        backstory: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        is_private: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true
        },
        is_analyzable: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        bounds: {
          type: Sequelize.TEXT,
          allowNull: true
        }
      }, { transaction })
      await queryInterface.addIndex('GuardianSites', ['guid'], { transaction })
    })
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('GuardianSites')
  }
}
