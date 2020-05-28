'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    console.log('\n\n000\n\n');
    return Promise.all([
      queryInterface.removeColumn('Classifications', 'reference_audio'),
      queryInterface.removeColumn('Classifications', 'reference_spectrogram'),
    ])

  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.addColumn(
        'Classifications',
        'reference_audio',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      ),
      queryInterface.addColumn(
        'Classifications',
        'reference_spectrogram',
        {
          type: Sequelize.STRING,
          allowNull: true,
        }
      ),
    ])
  }
};
