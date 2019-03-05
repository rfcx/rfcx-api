'use strict';

module.exports = {
  up: function (queryInterface, Sequelize, done) {

    queryInterface.addColumn(
      'GuardianSites',
      'map_image_url',
      {
        type: Sequelize.STRING,
        allowNull: true,
        validate: { }
      }
    );

    queryInterface.addColumn(
      'GuardianSites',
      'globe_icon_url',
      {
        type: Sequelize.STRING,
        allowNull: true,
        validate: { }
      }
    );

    queryInterface.addColumn(
      'GuardianSites',
      'classy_campaign_id',
      {
        type: Sequelize.STRING,
        allowNull: true,
        validate: { }
      }
    );

    queryInterface.addColumn(
      'GuardianSites',
      'protected_area',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: {
          isInt: true
        }
      }
    );

    queryInterface.addColumn(
      'GuardianSites',
      'backstory',
      {
        type: Sequelize.TEXT('long'),
        allowNull: true
      }
    );

    done();

  },

  down: function (queryInterface, Sequelize, done) {

    queryInterface.removeColumn('GuardianSites', 'map_image_url');
    queryInterface.removeColumn('GuardianSites', 'globe_icon_url');
    queryInterface.removeColumn('GuardianSites', 'classy_campaign_id');
    queryInterface.removeColumn('GuardianSites', 'protected_area');
    queryInterface.removeColumn('GuardianSites', 'backstory');

    done();

  }
};
