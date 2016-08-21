'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {

    migration.addColumn(
      'GuardianAudioHighlights',
      'order',
      {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: false,
        validate: {
          isInt: true,
          min: 0
        }
      }
    );

    done();
  },

  down: function(migration, DataTypes, done) {

    migration.removeColumn('GuardianAudioHighlights', 'order');

    done();
  }
};
