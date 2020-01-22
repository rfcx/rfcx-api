'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.addColumn(
        'GuardianAudioEventValueHighLevelKeys',
        'image',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      ),
      queryInterface.addColumn(
        'GuardianAudioEventValueHighLevelKeys',
        'description',
        {
          type: Sequelize.TEXT('long'),
          allowNull: true,
        }
      )
    ])
  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.removeColumn('GuardianAudioEventValueHighLevelKeys', 'image'),
      queryInterface.removeColumn('GuardianAudioEventValueHighLevelKeys', 'description')
    ])
  }
};
