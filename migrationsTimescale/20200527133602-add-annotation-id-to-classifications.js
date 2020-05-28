'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
console.log('\n\n111\n\n');
    return Promise.all([
      queryInterface.addColumn(
        'Classifications',
        'reference_annotation',
        {
          type: Sequelize.UUID,
          allowNull: true,
        }
      ),
    ]);

  },

  down: function (queryInterface, Sequelize) {

    return Promise.all([
      queryInterface.removeColumn('Classifications', 'reference_annotation'),
    ]);

  }
};
